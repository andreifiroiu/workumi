<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Agents\Tools\CreateProjectTool;
use App\Enums\AIConfidence;
use App\Enums\InboxItemType;
use App\Enums\ProjectStatus;
use App\Enums\SourceType;
use App\Enums\Urgency;
use App\Models\AgentConfiguration;
use App\Models\AIAgent;
use App\Models\GlobalAISettings;
use App\Models\InboxItem;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use App\Models\WorkOrder;
use App\Services\AgentRunner;
use App\Services\ToolGateway;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Process an inbound email through the Dispatcher Agent.
 *
 * Matches the sender to a user/team, runs the Dispatcher Agent to extract
 * proposed work, and applies a hybrid-by-confidence policy: high-confidence
 * entities are created live, while medium/low-confidence entities are created
 * as drafts paired with an InboxItem for human approval.
 */
class ProcessInboundEmail implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * The number of times the job may be attempted.
     */
    public int $tries = 3;

    /**
     * The number of seconds to wait before retrying the job.
     */
    public int $backoff = 60;

    /**
     * @param  array{from: ?string, subject: string, body: string, message_id: ?string}  $email
     */
    public function __construct(
        public readonly array $email,
    ) {}

    /**
     * Execute the job.
     */
    public function handle(AgentRunner $runner, ToolGateway $gateway): void
    {
        $from = strtolower(trim((string) ($this->email['from'] ?? '')));

        if ($from === '') {
            Log::info('Inbound email ignored: missing sender');

            return;
        }

        $user = User::query()->whereRaw('LOWER(email) = ?', [$from])->first();

        if ($user === null || $user->current_team_id === null) {
            Log::info('Inbound email ignored: unknown sender or no team', ['from' => $from]);

            return;
        }

        $teamId = (int) $user->current_team_id;
        $team = $user->currentTeam;

        $agent = AIAgent::query()->where('code', 'dispatcher')->first();

        $config = $agent !== null
            ? AgentConfiguration::query()
                ->where('team_id', $teamId)
                ->where('ai_agent_id', $agent->id)
                ->first()
            : null;

        if ($agent === null || $config === null || ! $config->enabled) {
            $this->flagForManualTriage($teamId, 'Dispatcher agent not configured for inbound email');

            return;
        }

        if ($team === null || ! GlobalAISettings::forTeam($team)->isInboundEmailEnabled()) {
            $this->flagForManualTriage($teamId, 'Inbound email processing is disabled for this team');

            return;
        }

        $defaultProject = $this->resolveDefaultProject($teamId, $user->id);

        $log = $runner->runWithPrompt($agent, $config, $this->buildPrompt($teamId, $defaultProject->id, $user->id));

        $entities = $this->parseEntities($log->output ?? '');

        if ($entities === []) {
            $this->flagForManualTriage($teamId, 'Dispatcher could not extract structured work from the email', $log->output);

            return;
        }

        // Claim this message so a duplicate delivery (or queue retry) does not
        // re-create entities. Done right before creation so earlier failures
        // (sender lookup, agent run) remain retryable.
        if (! $this->claimMessage()) {
            Log::info('Inbound email skipped: already processed', ['message_id' => $this->email['message_id'] ?? null]);

            return;
        }

        foreach ($entities as $entity) {
            try {
                $this->handleEntity($entity, $agent, $config, $gateway, $teamId, $user->id, $defaultProject);
            } catch (\Throwable $e) {
                Log::error('Inbound email: failed to process entity', [
                    'team_id' => $teamId,
                    'error' => $e->getMessage(),
                ]);
                $this->flagForManualTriage($teamId, 'Failed to create proposed work from the email: '.$e->getMessage());
            }
        }
    }

    /**
     * Atomically claim the inbound message for processing. Returns false when it
     * has already been claimed. Messages without an id are always processed.
     */
    private function claimMessage(): bool
    {
        $messageId = $this->email['message_id'] ?? null;

        if (empty($messageId)) {
            return true;
        }

        return Cache::add('inbound-email:'.sha1((string) $messageId), true, now()->addDay());
    }

    /**
     * Route a single proposed entity through the hybrid-by-confidence policy.
     *
     * @param  array<string, mixed>  $entity
     */
    private function handleEntity(
        array $entity,
        AIAgent $agent,
        AgentConfiguration $config,
        ToolGateway $gateway,
        int $teamId,
        int $userId,
        Project $defaultProject,
    ): void {
        $kind = strtolower((string) ($entity['kind'] ?? ''));
        $confidence = $this->mapConfidence($entity['confidence'] ?? null);
        $isHigh = $confidence === AIConfidence::High;
        $title = (string) ($entity['title'] ?? 'Untitled');

        match ($kind) {
            'project' => $this->handleProject($entity, $agent, $config, $gateway, $teamId, $userId, $confidence, $isHigh, $title),
            'work_order', 'workorder' => $this->handleWorkOrder($entity, $agent, $config, $gateway, $teamId, $userId, $defaultProject, $confidence, $isHigh, $title),
            'task' => $this->handleTask($entity, $agent, $config, $gateway, $teamId, $userId, $defaultProject, $confidence, $isHigh, $title),
            default => Log::info('Inbound email: skipping unknown entity kind', ['kind' => $kind]),
        };
    }

    /**
     * @param  array<string, mixed>  $entity
     */
    private function handleProject(array $entity, AIAgent $agent, AgentConfiguration $config, ToolGateway $gateway, int $teamId, int $userId, AIConfidence $confidence, bool $isHigh, string $title): void
    {
        if ($isHigh) {
            $result = $gateway->execute($agent, $config, 'create-project', [
                'team_id' => $teamId,
                'name' => $title,
                'description' => $entity['description'] ?? null,
                'owner_id' => $userId,
            ]);

            if (! $result->success) {
                $this->flagForManualTriage($teamId, "Failed to create project '{$title}': {$result->error}", json_encode($entity));
            }

            return;
        }

        // Projects have no draft state; queue the proposal for manual creation.
        $this->createApprovalItem($teamId, $confidence, "New project: {$title}", $entity, null);
    }

    /**
     * @param  array<string, mixed>  $entity
     */
    private function handleWorkOrder(array $entity, AIAgent $agent, AgentConfiguration $config, ToolGateway $gateway, int $teamId, int $userId, Project $defaultProject, AIConfidence $confidence, bool $isHigh, string $title): void
    {
        $result = $gateway->execute($agent, $config, 'create-draft-work-order', [
            'team_id' => $teamId,
            'project_id' => $defaultProject->id,
            'title' => $title,
            'description' => $entity['description'] ?? null,
            'priority' => $entity['priority'] ?? 'medium',
            'due_date' => $entity['due_date'] ?? null,
            'estimated_hours' => $entity['estimated_hours'] ?? 0,
            'created_by_id' => $userId,
        ]);

        if (! $result->success) {
            $this->flagForManualTriage($teamId, "Failed to create work order '{$title}': {$result->error}", json_encode($entity));

            return;
        }

        $workOrderId = $result->data['work_order']['id'] ?? null;

        if (! $isHigh && $workOrderId !== null) {
            $workOrder = WorkOrder::find($workOrderId);
            $this->createApprovalItem($teamId, $confidence, "Review work order: {$title}", $entity, $workOrder, $defaultProject->id);
        }
    }

    /**
     * @param  array<string, mixed>  $entity
     */
    private function handleTask(array $entity, AIAgent $agent, AgentConfiguration $config, ToolGateway $gateway, int $teamId, int $userId, Project $defaultProject, AIConfidence $confidence, bool $isHigh, string $title): void
    {
        $workOrder = $this->resolveDefaultWorkOrder($teamId, $defaultProject->id, $userId);

        $result = $gateway->execute($agent, $config, 'create-task', [
            'team_id' => $teamId,
            'work_order_id' => $workOrder->id,
            'title' => $title,
            'description' => $entity['description'] ?? null,
            'due_date' => $entity['due_date'] ?? null,
        ]);

        if (! $result->success) {
            $this->flagForManualTriage($teamId, "Failed to create task '{$title}': {$result->error}", json_encode($entity));

            return;
        }

        $taskId = $result->data['task']['id'] ?? null;

        if (! $isHigh && $taskId !== null) {
            $task = Task::find($taskId);
            $this->createApprovalItem($teamId, $confidence, "Review task: {$title}", $entity, $task, $defaultProject->id);
        }
    }

    /**
     * Create an InboxItem approval request for a draft entity awaiting review.
     *
     * @param  array<string, mixed>  $entity
     */
    private function createApprovalItem(int $teamId, AIConfidence $confidence, string $title, array $entity, ?Model $approvable, ?int $projectId = null): void
    {
        InboxItem::create([
            'team_id' => $teamId,
            'type' => InboxItemType::Approval,
            'source_type' => SourceType::AIAgent,
            'source_name' => 'Inbound Email Dispatcher',
            'source_id' => $this->email['message_id'] ?? null,
            'title' => $title,
            'content_preview' => Str::limit((string) ($entity['description'] ?? $this->email['subject'] ?? ''), 200),
            'full_content' => json_encode([
                'email' => $this->email,
                'proposed_entity' => $entity,
            ], JSON_PRETTY_PRINT),
            'urgency' => Urgency::Normal,
            'ai_confidence' => $confidence,
            'related_project_id' => $projectId,
            'related_work_order_id' => $approvable instanceof WorkOrder ? $approvable->id : null,
            'related_task_id' => $approvable instanceof Task ? $approvable->id : null,
            'approvable_type' => $approvable !== null ? $approvable->getMorphClass() : null,
            'approvable_id' => $approvable?->getKey(),
        ]);
    }

    /**
     * Create a non-actionable Flag inbox item for manual triage.
     */
    private function flagForManualTriage(int $teamId, string $reason, ?string $detail = null): void
    {
        Log::info('Inbound email flagged for manual triage', ['team_id' => $teamId, 'reason' => $reason]);

        InboxItem::create([
            'team_id' => $teamId,
            'type' => InboxItemType::Flag,
            'source_type' => SourceType::AIAgent,
            'source_name' => 'Inbound Email Dispatcher',
            'source_id' => $this->email['message_id'] ?? null,
            'title' => (string) ($this->email['subject'] ?? 'Inbound email'),
            'content_preview' => Str::limit($reason, 200),
            'full_content' => json_encode([
                'reason' => $reason,
                'email' => $this->email,
                'agent_output' => $detail,
            ], JSON_PRETTY_PRINT),
            'urgency' => Urgency::Normal,
        ]);
    }

    /**
     * Build the prompt sent to the Dispatcher Agent.
     */
    private function buildPrompt(int $teamId, int $defaultProjectId, int $userId): string
    {
        $subject = Str::limit((string) ($this->email['subject'] ?? ''), 300, '');
        // Cap the body to bound LLM token cost / abuse from oversized emails.
        $body = Str::limit((string) ($this->email['body'] ?? ''), 8000);

        return <<<PROMPT
        Triage the following inbound email into actionable work. Return ONLY JSON in the
        documented "entities" format, assigning a confidence to each entity.

        Context:
        - team_id: {$teamId}
        - default project_id (use for work orders when no better project applies): {$defaultProjectId}
        - requesting user_id: {$userId}

        Email subject: {$subject}

        Email body:
        {$body}
        PROMPT;
    }

    /**
     * Parse the agent's JSON output into a list of proposed entities.
     *
     * @return array<int, array<string, mixed>>
     */
    private function parseEntities(string $output): array
    {
        $start = strpos($output, '{');
        $end = strrpos($output, '}');

        if ($start === false || $end === false || $end < $start) {
            return [];
        }

        $decoded = json_decode(substr($output, $start, $end - $start + 1), true);

        if (! is_array($decoded) || ! isset($decoded['entities']) || ! is_array($decoded['entities'])) {
            return [];
        }

        return array_values(array_filter($decoded['entities'], 'is_array'));
    }

    /**
     * Map a free-form confidence string to the AIConfidence enum.
     */
    private function mapConfidence(mixed $value): AIConfidence
    {
        return AIConfidence::tryFrom(strtolower((string) $value)) ?? AIConfidence::Low;
    }

    /**
     * Resolve (or create) the team's default inbound "Inbox" project.
     */
    private function resolveDefaultProject(int $teamId, int $ownerId): Project
    {
        $party = CreateProjectTool::resolveInternalParty($teamId);

        return Project::firstOrCreate(
            ['team_id' => $teamId, 'name' => 'Inbox'],
            [
                'party_id' => $party->id,
                'owner_id' => $ownerId,
                'accountable_id' => $ownerId,
                'status' => ProjectStatus::Active,
                'start_date' => now(),
            ],
        );
    }

    /**
     * Resolve (or create) a default work order to parent inbound tasks.
     */
    private function resolveDefaultWorkOrder(int $teamId, int $projectId, int $userId): WorkOrder
    {
        return WorkOrder::firstOrCreate(
            ['team_id' => $teamId, 'project_id' => $projectId, 'title' => 'Inbound Email Tasks'],
            [
                'created_by_id' => $userId,
                'accountable_id' => $userId,
            ],
        );
    }
}

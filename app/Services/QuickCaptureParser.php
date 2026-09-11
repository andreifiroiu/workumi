<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\AIConfidence;
use App\Enums\CaptureType;
use App\Enums\Priority;
use App\Models\Party;
use App\Models\Project;
use App\Models\User;
use App\Models\WorkOrder;
use App\Services\AI\LLMService;
use App\ValueObjects\CaptureProposal;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Throwable;

/**
 * Turns a line of free text into a proposed capture.
 *
 * Read-only by design: it never writes a record. The proposal pre-fills the
 * capture form and the user confirms it. Degrades to a keyword heuristic when
 * the team has no LLM key configured, so capture keeps working without AI.
 */
class QuickCaptureParser
{
    /**
     * How many of each entity to name in the prompt. Enough to resolve "the Acme
     * redesign" by name without spending the context window on a large team.
     */
    private const CONTEXT_LIMIT = 40;

    public function __construct(
        private readonly ?LLMService $llmService = null,
    ) {}

    public function parse(string $text, User $user, int $teamId): CaptureProposal
    {
        $projects = $this->visibleProjects($user, $teamId);
        $workOrders = $this->visibleWorkOrders($user, $teamId);
        $hasParties = Party::query()->forTeam($teamId)->exists();

        $proposal = $this->parseViaLLM($text, $teamId, $user, $projects, $workOrders)
            ?? $this->parseViaHeuristics($text);

        return $this->downgradeUnsubmittable($proposal, $projects, $workOrders, $hasParties);
    }

    /**
     * Only ever propose a type the user can actually submit.
     *
     * Each record type needs a parent the form can offer: a task needs a work
     * order, a work order a project, a project a client. Proposing one whose
     * selector would be empty hands the user a form that refuses to save and no
     * way to see why, so it falls back to a note, which never needs a parent.
     *
     * @param  array<int, string>  $projects
     * @param  array<int, string>  $workOrders
     */
    private function downgradeUnsubmittable(
        CaptureProposal $proposal,
        array $projects,
        array $workOrders,
        bool $hasParties,
    ): CaptureProposal {
        $blocked = match ($proposal->type) {
            CaptureType::Task => $proposal->workOrderId === null && $workOrders === [],
            CaptureType::WorkOrder => $proposal->projectId === null && $projects === [],
            CaptureType::Project => ! $hasParties,
            CaptureType::Note => false,
        };

        if (! $blocked) {
            return $proposal;
        }

        return new CaptureProposal(
            type: CaptureType::Note,
            title: $proposal->title,
            description: $proposal->description,
            dueDateHint: $proposal->dueDateHint,
            confidence: $proposal->confidence,
            reasoning: $proposal->reasoning,
        );
    }

    /**
     * @param  array<int, string>  $projects  id => name
     * @param  array<int, string>  $workOrders  id => title
     */
    private function parseViaLLM(
        string $text,
        int $teamId,
        User $user,
        array $projects,
        array $workOrders,
    ): ?CaptureProposal {
        if ($this->llmService === null) {
            return null;
        }

        // Scoped to the call and its decoding only. Building the proposal happens
        // below, where a bug in our own mapping is allowed to surface instead of
        // being mistaken for a provider outage and silently downgraded.
        try {
            $response = $this->llmService->complete(
                systemPrompt: $this->systemPrompt(),
                userPrompt: $this->userPrompt($text, $projects, $workOrders),
                teamId: $teamId,
                userId: (int) $user->id,
            );

            if ($response === null) {
                return null;
            }

            $decoded = json_decode($this->stripCodeFence($response->content), true);
        } catch (Throwable $e) {
            Log::warning('Quick capture LLM parse failed, falling back to heuristics', [
                'team_id' => $teamId,
                'error' => $e->getMessage(),
            ]);

            return null;
        }

        if (! is_array($decoded) || ! isset($decoded['title']) || ! is_string($decoded['title'])) {
            Log::warning('Quick capture LLM returned unusable JSON, falling back to heuristics', [
                'team_id' => $teamId,
            ]);

            return null;
        }

        return $this->proposalFromDecoded($decoded, $text, $projects, $workOrders);
    }

    /**
     * Everything the model returns is untrusted. Ids are kept only when they name
     * a record this user can already see, so a hallucinated or cross-team id is
     * dropped rather than carried into the form.
     *
     * @param  array<string, mixed>  $decoded
     * @param  array<int, string>  $projects
     * @param  array<int, string>  $workOrders
     */
    private function proposalFromDecoded(
        array $decoded,
        string $text,
        array $projects,
        array $workOrders,
    ): CaptureProposal {
        $workOrderId = $this->allowedId($decoded['workOrderId'] ?? null, $workOrders);
        $projectId = $this->allowedId($decoded['projectId'] ?? null, $projects);

        $type = CaptureType::tryFrom((string) ($decoded['type'] ?? '')) ?? CaptureType::Task;

        // A task must hang off a work order. Without a usable one the proposal
        // would fail validation the moment the user pressed Create.
        if ($type === CaptureType::Task && $workOrderId === null) {
            $type = $projectId !== null ? CaptureType::WorkOrder : CaptureType::Note;
        }

        if ($type === CaptureType::WorkOrder && $projectId === null) {
            $type = CaptureType::Note;
        }

        return new CaptureProposal(
            type: $type,
            title: $this->trimTitle((string) $decoded['title']),
            description: $this->cleanString($decoded['description'] ?? null) ?? $this->descriptionFrom($text),
            projectId: $projectId,
            workOrderId: $workOrderId,
            partyId: null,
            dueDate: $this->normalizeDate($decoded['dueDate'] ?? null),
            dueDateHint: $this->unreadableDate($decoded['dueDate'] ?? null),
            priority: $this->normalizePriority($decoded['priority'] ?? null),
            confidence: match (strtolower((string) ($decoded['confidence'] ?? 'medium'))) {
                'high' => AIConfidence::High,
                'low' => AIConfidence::Low,
                default => AIConfidence::Medium,
            },
            reasoning: $this->cleanString($decoded['reasoning'] ?? null),
        );
    }

    /**
     * No LLM available. Take the first line as the title and guess the type from
     * a few unambiguous words, so the user still gets a pre-filled form.
     */
    private function parseViaHeuristics(string $text): CaptureProposal
    {
        $trimmed = trim($text);
        $firstLine = trim(Str::before($trimmed, "\n"));
        $lower = Str::lower($trimmed);

        $type = match (true) {
            Str::startsWith($lower, ['note:', 'note ']) || Str::contains($lower, 'make a note') => CaptureType::Note,
            Str::startsWith($lower, ['project:', 'new project']) => CaptureType::Project,
            Str::startsWith($lower, ['work order:', 'new work order']) => CaptureType::WorkOrder,
            default => CaptureType::Task,
        };

        return new CaptureProposal(
            type: $type,
            title: $this->trimTitle($firstLine !== '' ? $firstLine : 'Untitled capture'),
            description: $this->descriptionFrom($trimmed),
            confidence: AIConfidence::Low,
            // Deliberately does not claim the team has no AI provider: this path
            // is also reached when a configured provider errors or returns
            // nonsense, and telling those users to go set one up sends them
            // after a problem they do not have.
            reasoning: 'AI parsing was unavailable, so this was read with a simple rule. Check the fields before creating.',
        );
    }

    private function systemPrompt(): string
    {
        return <<<'PROMPT'
        You turn a short note typed by a project manager into one structured record.

        Respond with a single JSON object and nothing else. Shape:
        {"type":"project|work_order|task|note","title":"...","description":"...
        or null","projectId":null,"workOrderId":null,"dueDate":"YYYY-MM-DD or
        null","priority":"low|medium|high|urgent or null","confidence":"high|
        medium|low","reasoning":"one short sentence"}

        Rules:
        - "type" is "task" for a single action, "work_order" for a scoped piece of
          work with several steps, "project" for a whole engagement, "note" for
          something to remember rather than do.
        - Only use a projectId or workOrderId from the lists given. Never invent
          one. Use null when nothing clearly matches.
        - A task needs a workOrderId. A work order needs a projectId. If you
          cannot pick one confidently, choose "note" instead.
        - "title" is short and imperative. Put any remaining detail in
          "description".
        - Set "confidence" to "low" when you are guessing.
        PROMPT;
    }

    /**
     * @param  array<int, string>  $projects
     * @param  array<int, string>  $workOrders
     */
    private function userPrompt(string $text, array $projects, array $workOrders): string
    {
        return implode("\n\n", [
            'Projects (id: name):',
            $this->formatContext($projects),
            'Work orders (id: title):',
            $this->formatContext($workOrders),
            'Today is '.now()->toDateString().'.',
            'Note to convert:',
            $text,
        ]);
    }

    /**
     * @param  array<int, string>  $items
     */
    private function formatContext(array $items): string
    {
        if ($items === []) {
            return '(none)';
        }

        $lines = [];
        foreach ($items as $id => $label) {
            $lines[] = "{$id}: {$label}";
        }

        return implode("\n", $lines);
    }

    /**
     * @return array<int, string>
     */
    private function visibleProjects(User $user, int $teamId): array
    {
        return Project::query()
            ->forTeam($teamId)
            ->visibleTo((int) $user->id)
            ->notArchived()
            ->orderByDesc('updated_at')
            ->limit(self::CONTEXT_LIMIT)
            ->pluck('name', 'id')
            ->all();
    }

    /**
     * @return array<int, string>
     */
    private function visibleWorkOrders(User $user, int $teamId): array
    {
        return WorkOrder::query()
            ->forTeam($teamId)
            ->visibleTo((int) $user->id)
            ->notArchived()
            ->orderByDesc('updated_at')
            ->limit(self::CONTEXT_LIMIT)
            ->pluck('title', 'id')
            ->all();
    }

    /**
     * @param  array<int, string>  $allowed
     */
    private function allowedId(mixed $value, array $allowed): ?int
    {
        if ($value === null || $value === '' || ! is_numeric($value)) {
            return null;
        }

        $id = (int) $value;

        return array_key_exists($id, $allowed) ? $id : null;
    }

    /**
     * The raw deadline when it could not be read as a date, so a phrase like
     * "end of month" is surfaced for the user to resolve rather than dropped
     * from a form they are only skimming.
     */
    private function unreadableDate(mixed $value): ?string
    {
        if (! is_string($value) || trim($value) === '' || $this->normalizeDate($value) !== null) {
            return null;
        }

        return Str::limit(trim($value), 60);
    }

    private function normalizeDate(mixed $value): ?string
    {
        if (! is_string($value) || trim($value) === '') {
            return null;
        }

        try {
            return Carbon::parse($value)->toDateString();
        } catch (Throwable) {
            return null;
        }
    }

    private function normalizePriority(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        return Priority::tryFrom(strtolower(trim($value)))?->value;
    }

    private function descriptionFrom(string $text): ?string
    {
        $rest = trim(Str::after($text, "\n"));

        return $rest !== '' && $rest !== trim($text) ? $rest : null;
    }

    private function cleanString(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $trimmed = trim($value);

        return $trimmed === '' ? null : $trimmed;
    }

    private function trimTitle(string $title): string
    {
        return Str::limit(trim($title), 252);
    }

    /**
     * Models often wrap JSON in a markdown fence despite being told not to.
     */
    private function stripCodeFence(string $content): string
    {
        $trimmed = trim($content);

        if (! str_starts_with($trimmed, '```')) {
            return $trimmed;
        }

        $withoutOpening = preg_replace('/^```(?:json)?\s*/i', '', $trimmed) ?? $trimmed;

        return trim(preg_replace('/```$/', '', $withoutOpening) ?? $withoutOpening);
    }
}

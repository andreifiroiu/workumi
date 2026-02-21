<?php

declare(strict_types=1);

namespace App\Agents\Workflows;

use App\Agents\Tools\WorkOrderInfoTool;
use App\Enums\AIConfidence;
use App\Enums\InboxItemType;
use App\Enums\SourceType;
use App\Enums\Urgency;
use App\Models\AgentConfiguration;
use App\Models\AgentWorkflowState;
use App\Models\InboxItem;
use App\Models\WorkOrder;
use App\Services\AgentApprovalService;
use App\Services\AgentOrchestrator;
use App\Services\AgentRunner;
use App\Services\ContextBuilder;
use App\Services\PlaybookSearchService;
use App\Support\KeywordExtractor;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Log;

/**
 * Workflow for the PM Copilot Agent.
 *
 * Defines the step-by-step process for analyzing work orders,
 * generating deliverables, breaking down into tasks, and providing
 * project insights. Supports staged (with approval checkpoint) and
 * full plan modes.
 */
class PMCopilotWorkflow extends BaseAgentWorkflow
{
    private readonly ?AgentRunner $agentRunner;

    public function __construct(
        AgentOrchestrator $orchestrator,
        AgentApprovalService $approvalService,
        ?AgentRunner $agentRunner = null,
    ) {
        parent::__construct($orchestrator, $approvalService);
        $this->agentRunner = $agentRunner;
    }

    /**
     * Get the workflow identifier.
     */
    public function getIdentifier(): string
    {
        return 'pm-copilot';
    }

    /**
     * Get the workflow description.
     */
    public function getDescription(): string
    {
        return 'Analyzes work orders to generate deliverable alternatives, break down into tasks with estimates, and provide project insights. Supports staged review or full plan generation.';
    }

    /**
     * Define the workflow steps.
     *
     * @return array<string, callable> Map of step names to step handlers
     */
    protected function defineSteps(): array
    {
        return [
            'gather_context' => fn (AgentWorkflowState $state) => $this->gatherContext($state),
            'generate_deliverables' => fn (AgentWorkflowState $state) => $this->generateDeliverables($state),
            'checkpoint_deliverables' => fn (AgentWorkflowState $state) => $this->checkpointDeliverables($state),
            'generate_task_breakdown' => fn (AgentWorkflowState $state) => $this->generateTaskBreakdown($state),
            'generate_insights' => fn (AgentWorkflowState $state) => $this->generateInsights($state),
            'present_results' => fn (AgentWorkflowState $state) => $this->presentResults($state),
        ];
    }

    /**
     * Step 1: Gather context for the work order and project.
     *
     * Assembles work order details, project context, and relevant playbooks
     * to provide the agent with comprehensive information for planning.
     *
     * @return array{status: string, context: array<string, mixed>}
     */
    protected function gatherContext(AgentWorkflowState $state): array
    {
        $input = $state->state_data['input'] ?? [];
        $workOrderId = $input['work_order_id'] ?? null;
        $teamId = $input['team_id'] ?? null;

        $contextData = [
            'gathered_at' => now()->toIso8601String(),
        ];

        // Retrieve work order information
        if ($workOrderId !== null) {
            $workOrderInfoTool = new WorkOrderInfoTool;
            $workOrderInfo = $workOrderInfoTool->execute([
                'work_order_id' => $workOrderId,
                'include_task_summary' => true,
                'include_deliverables' => true,
            ]);
            $contextData['work_order'] = $workOrderInfo['work_order'] ?? [];

            // Build project and client context via ContextBuilder
            $workOrder = WorkOrder::with('project')->find($workOrderId);
            if ($workOrder !== null && $workOrder->project !== null) {
                $contextBuilder = App::make(ContextBuilder::class);
                $agent = $state->agent;

                if ($agent !== null) {
                    $agentContext = $contextBuilder->build($workOrder, $agent);
                    $contextData['project_context'] = $agentContext->projectContext;
                    $contextData['client_context'] = $agentContext->clientContext;
                    $contextData['org_context'] = $agentContext->orgContext;
                }
            }
        }

        // Query relevant playbooks using shared keyword extraction + multi-strategy search
        if ($teamId !== null) {
            $workOrderData = $contextData['work_order'] ?? [];
            $keywords = KeywordExtractor::extract(
                $workOrderData['title'] ?? '',
                $workOrderData['description'] ?? '',
                ...((array) ($workOrderData['acceptance_criteria'] ?? [])),
            );
            $contextData['playbooks'] = (new PlaybookSearchService)
                ->findRelevantPlaybooks($teamId, $keywords)
                ->map(fn (\App\Models\Playbook $p) => [
                    'id' => $p->id,
                    'name' => $p->name,
                    'description' => $p->description,
                    'type' => $p->type?->value,
                    'tags' => $p->tags ?? [],
                    'content' => $p->content,
                    'times_applied' => $p->times_applied,
                    'last_used' => $p->last_used?->toDateTimeString(),
                    'ai_generated' => $p->ai_generated,
                ])->toArray();
        }

        $this->mergeStateData($state, [
            'context' => $contextData,
        ]);

        return [
            'status' => 'completed',
            'context' => $contextData,
        ];
    }

    /**
     * Step 2: Generate deliverable alternatives.
     *
     * Analyzes the work order context to create 2-3 alternative
     * deliverable structures with confidence levels.
     *
     * @return array{status: string, deliverable_alternatives: array<int, array<string, mixed>>}
     */
    protected function generateDeliverables(AgentWorkflowState $state): array
    {
        $context = $state->state_data['context'] ?? [];
        $workOrder = $context['work_order'] ?? [];
        $playbooks = $context['playbooks'] ?? [];

        $deliverableAlternatives = null;

        // Try LLM-based generation
        $llmResponse = $this->callLLM($state, $this->buildDeliverablesPrompt($workOrder, $playbooks));
        if ($llmResponse !== null) {
            $parsed = $this->extractJson($llmResponse);
            if ($parsed !== null && isset($parsed['alternatives']) && is_array($parsed['alternatives'])) {
                $deliverableAlternatives = $parsed['alternatives'];
            }
        }

        // Fallback to hardcoded logic
        if ($deliverableAlternatives === null) {
            $deliverableAlternatives = $this->buildDeliverableAlternatives($workOrder, $playbooks);
        }

        $this->mergeStateData($state, [
            'deliverable_alternatives' => $deliverableAlternatives,
            'deliverables_generated_at' => now()->toIso8601String(),
        ]);

        return [
            'status' => 'completed',
            'deliverable_alternatives' => $deliverableAlternatives,
        ];
    }

    /**
     * Step 3: Checkpoint for deliverable approval (staged mode only).
     *
     * In staged mode, pauses the workflow for human review of deliverables.
     * In full mode, continues directly to task breakdown.
     *
     * @return array{status: string}
     */
    protected function checkpointDeliverables(AgentWorkflowState $state): array
    {
        $input = $state->state_data['input'] ?? [];
        $mode = $input['pm_copilot_mode'] ?? 'full';

        // Only pause in staged mode
        if ($mode === 'staged') {
            $this->pauseForApproval(
                'Deliverable review required',
                'Review and approve the generated deliverable alternatives before task breakdown'
            );

            return [
                'status' => 'paused',
            ];
        }

        return [
            'status' => 'completed',
        ];
    }

    /**
     * Step 4: Generate task breakdown from deliverables.
     *
     * Breaks down the approved deliverables into actionable tasks
     * with LLM-based duration estimates and dependencies.
     *
     * @return array{status: string, task_breakdown: array<int, array<string, mixed>>}
     */
    protected function generateTaskBreakdown(AgentWorkflowState $state): array
    {
        $context = $state->state_data['context'] ?? [];
        $alternatives = $state->state_data['deliverable_alternatives'] ?? [];
        $playbooks = $context['playbooks'] ?? [];

        // Generate task breakdowns for ALL alternatives in a single LLM call
        $taskBreakdownByAlternative = [];

        // Try LLM-based generation for all alternatives at once
        $llmResponse = $this->callLLM($state, $this->buildAllAlternativesTaskBreakdownPrompt($alternatives, $playbooks));
        if ($llmResponse !== null) {
            $parsed = $this->extractJson($llmResponse);
            if ($parsed !== null && isset($parsed['alternatives']) && is_array($parsed['alternatives'])) {
                foreach ($parsed['alternatives'] as $altBreakdown) {
                    $altId = (string) ($altBreakdown['alternative_id'] ?? '');
                    if ($altId !== '' && isset($altBreakdown['task_breakdown']) && is_array($altBreakdown['task_breakdown'])) {
                        $taskBreakdownByAlternative[$altId] = $altBreakdown['task_breakdown'];
                    }
                }
            }
        }

        // Fallback: generate hardcoded tasks for any alternative not covered by LLM
        foreach ($alternatives as $alternative) {
            $alternativeId = (string) ($alternative['alternative_id'] ?? '');
            if (! isset($taskBreakdownByAlternative[$alternativeId])) {
                $deliverables = $alternative['deliverables'] ?? [];
                $taskBreakdownByAlternative[$alternativeId] = ! empty($deliverables)
                    ? $this->buildTaskBreakdown($deliverables, $playbooks)
                    : [];
            }
        }

        // Store flat task_breakdown for backward compatibility (using first alternative)
        $firstAlternativeId = (string) ($alternatives[0]['alternative_id'] ?? '');
        $flatTaskBreakdown = $taskBreakdownByAlternative[$firstAlternativeId] ?? [];

        $this->mergeStateData($state, [
            'task_breakdown' => $flatTaskBreakdown,
            'task_breakdown_by_alternative' => $taskBreakdownByAlternative,
            'tasks_generated_at' => now()->toIso8601String(),
        ]);

        return [
            'status' => 'completed',
            'task_breakdown' => $flatTaskBreakdown,
            'task_breakdown_by_alternative' => $taskBreakdownByAlternative,
        ];
    }

    /**
     * Step 5: Generate project insights.
     *
     * Analyzes the project data to identify bottlenecks, overdue items,
     * resource allocation issues, and scope creep risks.
     *
     * @return array{status: string, insights: array<int, array<string, mixed>>}
     */
    protected function generateInsights(AgentWorkflowState $state): array
    {
        $context = $state->state_data['context'] ?? [];
        $projectContext = $context['project_context'] ?? [];

        $insights = null;

        // Try LLM-based generation
        $llmResponse = $this->callLLM($state, $this->buildInsightsPrompt($context));
        if ($llmResponse !== null) {
            $parsed = $this->extractJson($llmResponse);
            if ($parsed !== null && isset($parsed['insights']) && is_array($parsed['insights'])) {
                $insights = $parsed['insights'];
            }
        }

        // Fallback to hardcoded logic
        if ($insights === null) {
            $insights = $this->buildProjectInsights($projectContext);
        }

        $this->mergeStateData($state, [
            'insights' => $insights,
            'insights_generated_at' => now()->toIso8601String(),
        ]);

        return [
            'status' => 'completed',
            'insights' => $insights,
        ];
    }

    /**
     * Step 6: Present the final results.
     *
     * Formats and returns the complete output including deliverables,
     * task breakdown, and insights.
     *
     * @return array{status: string, results: array<string, mixed>}
     */
    protected function presentResults(AgentWorkflowState $state): array
    {
        $deliverables = $state->state_data['deliverable_alternatives'] ?? [];
        $taskBreakdown = $state->state_data['task_breakdown'] ?? [];
        $insights = $state->state_data['insights'] ?? [];

        $results = [
            'deliverable_alternatives' => $deliverables,
            'task_breakdown' => $taskBreakdown,
            'insights' => $insights,
            'generated_at' => now()->toIso8601String(),
        ];

        $this->complete($results);

        $this->createInboxItem($state, $deliverables, $taskBreakdown);

        return [
            'status' => 'completed',
            'results' => $results,
        ];
    }

    /**
     * Hook called when the workflow starts.
     *
     * @param  array<string, mixed>  $input  The input data
     */
    protected function onStart(array $input): void
    {
        $this->mergeStateData($this->state, [
            'started_at' => now()->toIso8601String(),
            'input' => $input,
        ]);
    }

    /**
     * Hook called when the workflow is resumed after approval.
     *
     * Processes approval/rejection data from InboxItem and updates
     * workflow state with approved deliverables.
     *
     * @param  array<string, mixed>  $approvalData  Data from the approval
     */
    protected function onResume(array $approvalData): void
    {
        $this->mergeStateData($this->state, [
            'approval_data' => $approvalData,
            'resumed_at' => now()->toIso8601String(),
        ]);

        // Process approved deliverables if present
        if (isset($approvalData['approved_deliverables'])) {
            $approvedDeliverables = array_filter(
                $approvalData['approved_deliverables'],
                fn (array $deliverable) => ($deliverable['approved'] ?? false) === true
            );

            $this->mergeStateData($this->state, [
                'approved_deliverables' => array_values($approvedDeliverables),
            ]);
        }
    }

    /**
     * Hook called when the workflow completes.
     *
     * @param  array<string, mixed>  $result  The final result
     */
    protected function onComplete(array $result): void
    {
        $this->mergeStateData($this->state, [
            'final_result' => $result,
            'completed_at' => now()->toIso8601String(),
        ]);
    }

    /**
     * Call the LLM via AgentRunner and return the raw output string, or null on failure.
     */
    private function callLLM(AgentWorkflowState $state, string $prompt): ?string
    {
        if ($this->agentRunner === null) {
            return null;
        }

        $agent = $state->agent;
        if ($agent === null) {
            return null;
        }

        $config = AgentConfiguration::query()
            ->where('ai_agent_id', $agent->id)
            ->where('team_id', $state->team_id)
            ->where('enabled', true)
            ->first();

        if ($config === null) {
            return null;
        }

        $workOrderId = $state->state_data['input']['work_order_id'] ?? null;
        $contextEntity = $workOrderId !== null ? WorkOrder::find($workOrderId) : null;

        try {
            $activityLog = $this->agentRunner->runWithPrompt($agent, $config, $prompt, $contextEntity);

            if ($activityLog->error !== null) {
                Log::warning('PMCopilotWorkflow LLM call returned error', [
                    'error' => $activityLog->error,
                    'workflow_state_id' => $state->id,
                ]);

                return null;
            }

            return $activityLog->output;
        } catch (\Throwable $e) {
            Log::warning('PMCopilotWorkflow LLM call failed', [
                'error' => $e->getMessage(),
                'workflow_state_id' => $state->id,
            ]);

            return null;
        }
    }

    /**
     * Extract a JSON object from an LLM response string.
     *
     * Looks for ```json fenced blocks first, then tries raw JSON parsing.
     *
     * @return array<string, mixed>|null
     */
    private function extractJson(string $response): ?array
    {
        // Try to extract from ```json code fences
        if (preg_match('/```json\s*([\s\S]*?)\s*```/', $response, $matches)) {
            $decoded = json_decode(trim($matches[1]), true);
            if (is_array($decoded)) {
                return $decoded;
            }
        }

        // Try raw JSON parsing
        $decoded = json_decode(trim($response), true);
        if (is_array($decoded)) {
            return $decoded;
        }

        return null;
    }

    /**
     * Build the LLM prompt for generating deliverable alternatives.
     *
     * @param  array<string, mixed>  $workOrder
     * @param  array<int, array<string, mixed>>  $playbooks
     */
    private function buildDeliverablesPrompt(array $workOrder, array $playbooks): string
    {
        $title = $workOrder['title'] ?? 'Untitled Work Order';
        $description = $workOrder['description'] ?? 'No description provided.';
        $acceptanceCriteria = $workOrder['acceptance_criteria'] ?? [];
        $criteriaText = ! empty($acceptanceCriteria) ? implode("\n- ", $acceptanceCriteria) : 'None specified';

        $playbookText = '';
        foreach ($playbooks as $playbook) {
            $playbookText .= "- {$playbook['name']}: {$playbook['description']}\n";
        }
        if ($playbookText === '') {
            $playbookText = 'None available.';
        }

        return <<<PROMPT
Analyze the following work order and generate 2-3 alternative deliverable structures.

## Work Order
Title: {$title}
Description: {$description}
Acceptance Criteria:
- {$criteriaText}

## Available Playbooks
{$playbookText}

## Instructions
Generate 2-3 alternative approaches for structuring deliverables. Each alternative should have a different strategy (e.g., single deliverable, multi-phase, template-based).

Respond with ONLY a JSON object wrapped in ```json fences using this exact schema:

```json
{
  "alternatives": [
    {
      "alternative_id": 1,
      "name": "Name of approach",
      "deliverables": [
        {
          "title": "Deliverable title",
          "description": "Deliverable description",
          "type": "document|deliverable|code|design",
          "acceptance_criteria": ["criterion 1", "criterion 2"],
          "confidence": "low|medium|high"
        }
      ],
      "confidence": "low|medium|high",
      "reasoning": "Why this approach is suitable"
    }
  ]
}
```
PROMPT;
    }

    /**
     * Build the LLM prompt for generating task breakdowns for all alternatives at once.
     *
     * @param  array<int, array<string, mixed>>  $alternatives
     * @param  array<int, array<string, mixed>>  $playbooks
     */
    private function buildAllAlternativesTaskBreakdownPrompt(array $alternatives, array $playbooks): string
    {
        $alternativesText = '';
        foreach ($alternatives as $alternative) {
            $altId = $alternative['alternative_id'] ?? '?';
            $altName = $alternative['name'] ?? 'Untitled';
            $alternativesText .= "### Alternative {$altId}: {$altName}\n";

            $deliverables = $alternative['deliverables'] ?? [];
            foreach ($deliverables as $i => $deliverable) {
                $num = $i + 1;
                $title = $deliverable['title'] ?? 'Untitled';
                $desc = $deliverable['description'] ?? '';
                $alternativesText .= "  {$num}. {$title}: {$desc}\n";
            }

            $alternativesText .= "\n";
        }

        if ($alternativesText === '') {
            $alternativesText = 'No alternatives provided.';
        }

        $playbookText = '';
        foreach ($playbooks as $playbook) {
            $playbookText .= "- {$playbook['name']}: {$playbook['description']}\n";
        }

        if ($playbookText === '') {
            $playbookText = 'None available.';
        }

        return <<<PROMPT
Break down each alternative's deliverables into actionable tasks with time estimates.

## Alternatives
{$alternativesText}
## Available Playbooks
{$playbookText}

## Instructions
For each alternative, break down every deliverable into tasks covering planning, execution, and review. Provide realistic hour estimates and identify dependencies between tasks.

Respond with ONLY a JSON object wrapped in ```json fences using this exact schema:

```json
{
  "alternatives": [
    {
      "alternative_id": 1,
      "task_breakdown": [
        {
          "deliverable_title": "Exact title of the deliverable",
          "tasks": [
            {
              "title": "Task title",
              "description": "Task description",
              "estimated_hours": 2.0,
              "position_in_work_order": 1,
              "checklist_items": ["item 1", "item 2"],
              "dependencies": [],
              "confidence": "low|medium|high"
            }
          ],
          "total_estimated_hours": 12.0,
          "confidence": "low|medium|high"
        }
      ]
    }
  ]
}
```
PROMPT;
    }

    /**
     * Build the LLM prompt for generating project insights.
     *
     * @param  array<string, mixed>  $context
     */
    private function buildInsightsPrompt(array $context): string
    {
        $projectContext = $context['project_context'] ?? [];
        $workOrder = $context['work_order'] ?? [];

        $contextJson = json_encode([
            'project' => $projectContext,
            'work_order' => $workOrder,
        ], JSON_PRETTY_PRINT);

        return <<<PROMPT
Analyze the following project data and identify actionable insights including overdue items, bottlenecks, scope creep risks, and resource allocation issues.

## Project Data
{$contextJson}

## Instructions
Identify specific, actionable insights. Classify each by type (overdue, bottleneck, scope_creep, resource) and severity (low, medium, high).

Respond with ONLY a JSON object wrapped in ```json fences using this exact schema:

```json
{
  "insights": [
    {
      "type": "overdue|bottleneck|scope_creep|resource",
      "severity": "low|medium|high",
      "title": "Brief title",
      "description": "Detailed description of the insight",
      "affected_items": [],
      "suggestion": "Recommended action",
      "confidence": "low|medium|high"
    }
  ]
}
```
PROMPT;
    }

    /**
     * Build deliverable alternatives from work order context.
     *
     * @param  array<string, mixed>  $workOrder
     * @param  array<int, array<string, mixed>>  $playbooks
     * @return array<int, array<string, mixed>>
     */
    private function buildDeliverableAlternatives(array $workOrder, array $playbooks): array
    {
        $title = $workOrder['title'] ?? 'Untitled Work Order';
        $description = $workOrder['description'] ?? '';
        $acceptanceCriteria = $workOrder['acceptance_criteria'] ?? [];

        // Generate 2-3 alternatives based on available context
        $alternatives = [];

        // Alternative 1: Standard deliverable structure
        $alternatives[] = [
            'alternative_id' => 1,
            'name' => 'Standard Approach',
            'deliverables' => [
                [
                    'title' => "Primary Deliverable for {$title}",
                    'description' => "Main deliverable based on work order requirements: {$description}",
                    'type' => 'document',
                    'acceptance_criteria' => $acceptanceCriteria,
                    'confidence' => $this->determineConfidence($description, $acceptanceCriteria, $playbooks),
                ],
            ],
            'confidence' => 'medium',
            'reasoning' => 'Standard single-deliverable approach based on work order description.',
        ];

        // Alternative 2: Multi-phase deliverable structure
        if (! empty($description)) {
            $alternatives[] = [
                'alternative_id' => 2,
                'name' => 'Multi-Phase Approach',
                'deliverables' => [
                    [
                        'title' => "Phase 1: Planning for {$title}",
                        'description' => 'Initial planning and requirements gathering phase.',
                        'type' => 'document',
                        'acceptance_criteria' => ['Requirements documented', 'Plan approved'],
                        'confidence' => 'medium',
                    ],
                    [
                        'title' => "Phase 2: Implementation for {$title}",
                        'description' => 'Core implementation and delivery phase.',
                        'type' => 'deliverable',
                        'acceptance_criteria' => $acceptanceCriteria,
                        'confidence' => 'medium',
                    ],
                ],
                'confidence' => 'medium',
                'reasoning' => 'Phased approach allowing for iterative review and approval.',
            ];
        }

        // Alternative 3: Playbook-based structure (if applicable)
        if (! empty($playbooks)) {
            $playbook = $playbooks[0];
            $alternatives[] = [
                'alternative_id' => 3,
                'name' => 'Template-Based Approach',
                'deliverables' => [
                    [
                        'title' => "Deliverable based on {$playbook['name']}",
                        'description' => "Following template: {$playbook['description']}",
                        'type' => $playbook['type'] ?? 'document',
                        'acceptance_criteria' => $acceptanceCriteria,
                        'confidence' => 'high',
                    ],
                ],
                'confidence' => 'high',
                'reasoning' => "Based on existing playbook: {$playbook['name']}",
            ];
        }

        return $alternatives;
    }

    /**
     * Build task breakdown from deliverables.
     *
     * @param  array<int, array<string, mixed>>  $deliverables
     * @param  array<int, array<string, mixed>>  $playbooks
     * @return array<int, array<string, mixed>>
     */
    private function buildTaskBreakdown(array $deliverables, array $playbooks): array
    {
        $taskBreakdown = [];
        $position = 1;

        foreach ($deliverables as $deliverable) {
            $deliverableTitle = $deliverable['title'] ?? 'Untitled Deliverable';

            // Generate tasks for each deliverable
            $tasks = [
                [
                    'title' => "Plan: {$deliverableTitle}",
                    'description' => 'Initial planning and requirements analysis.',
                    'estimated_hours' => 2.0,
                    'position_in_work_order' => $position++,
                    'checklist_items' => ['Review requirements', 'Define approach', 'Estimate effort'],
                    'dependencies' => [],
                    'confidence' => 'medium',
                ],
                [
                    'title' => "Execute: {$deliverableTitle}",
                    'description' => 'Main execution of deliverable requirements.',
                    'estimated_hours' => 8.0,
                    'position_in_work_order' => $position++,
                    'checklist_items' => $this->extractChecklistFromPlaybooks($playbooks),
                    'dependencies' => [$position - 2],
                    'confidence' => 'medium',
                ],
                [
                    'title' => "Review: {$deliverableTitle}",
                    'description' => 'Quality review and acceptance testing.',
                    'estimated_hours' => 2.0,
                    'position_in_work_order' => $position++,
                    'checklist_items' => ['Quality check', 'Test against criteria', 'Document findings'],
                    'dependencies' => [$position - 2],
                    'confidence' => 'high',
                ],
            ];

            $taskBreakdown[] = [
                'deliverable_title' => $deliverableTitle,
                'tasks' => $tasks,
                'total_estimated_hours' => array_sum(array_column($tasks, 'estimated_hours')),
                'confidence' => 'medium',
            ];
        }

        return $taskBreakdown;
    }

    /**
     * Build project insights from context.
     *
     * @param  array<string, mixed>  $projectContext
     * @return array<int, array<string, mixed>>
     */
    private function buildProjectInsights(array $projectContext): array
    {
        $insights = [];

        // Check for overdue items
        $pendingTasks = $projectContext['pending_tasks'] ?? [];
        $overdueTasks = array_filter($pendingTasks, function (array $task) {
            $dueDate = $task['due_date'] ?? null;

            return $dueDate !== null && strtotime($dueDate) < strtotime('today');
        });

        if (! empty($overdueTasks)) {
            $insights[] = [
                'type' => 'overdue',
                'severity' => 'high',
                'title' => 'Overdue Tasks Detected',
                'description' => count($overdueTasks).' task(s) are past their due date.',
                'affected_items' => array_column($overdueTasks, 'id'),
                'suggestion' => 'Review and reprioritize overdue tasks or update due dates.',
                'confidence' => 'high',
            ];
        }

        // Check for blocked tasks
        $blockedTasks = array_filter($pendingTasks, fn (array $task) => ($task['is_blocked'] ?? false) === true);

        if (! empty($blockedTasks)) {
            $insights[] = [
                'type' => 'bottleneck',
                'severity' => 'medium',
                'title' => 'Blocked Tasks Identified',
                'description' => count($blockedTasks).' task(s) are currently blocked.',
                'affected_items' => array_column($blockedTasks, 'id'),
                'suggestion' => 'Review blockers and resolve dependencies to unblock work.',
                'confidence' => 'high',
            ];
        }

        // Check for scope creep indicators
        $budgetHours = $projectContext['budget_hours'] ?? 0;
        $actualHours = $projectContext['actual_hours'] ?? 0;

        if ($budgetHours > 0 && $actualHours > $budgetHours * 0.8) {
            $percentUsed = round(($actualHours / $budgetHours) * 100);
            $insights[] = [
                'type' => 'scope_creep',
                'severity' => $percentUsed >= 100 ? 'high' : 'medium',
                'title' => 'Budget Hours Warning',
                'description' => "Project has used {$percentUsed}% of budgeted hours.",
                'affected_items' => [],
                'suggestion' => 'Review scope and consider adjusting budget or timeline.',
                'confidence' => 'high',
            ];
        }

        return $insights;
    }

    /**
     * Determine confidence level based on available context.
     *
     * @param  array<int, string>  $acceptanceCriteria
     * @param  array<int, array<string, mixed>>  $playbooks
     */
    private function determineConfidence(string $description, array $acceptanceCriteria, array $playbooks): string
    {
        $hasDescription = ! empty($description);
        $hasCriteria = ! empty($acceptanceCriteria);
        $hasPlaybooks = ! empty($playbooks);

        if ($hasDescription && $hasCriteria && $hasPlaybooks) {
            return 'high';
        }

        if ($hasDescription && ($hasCriteria || $hasPlaybooks)) {
            return 'medium';
        }

        return 'low';
    }

    /**
     * Extract checklist items from playbooks.
     *
     * @param  array<int, array<string, mixed>>  $playbooks
     * @return array<int, string>
     */
    private function extractChecklistFromPlaybooks(array $playbooks): array
    {
        if (empty($playbooks)) {
            return ['Complete task requirements', 'Verify output quality'];
        }

        $playbook = $playbooks[0];
        $content = $playbook['content'] ?? '';

        // Simple extraction of checklist items from playbook content
        if (is_array($content) && isset($content['checklist'])) {
            return array_slice($content['checklist'], 0, 5);
        }

        return ['Follow playbook guidelines', 'Complete all requirements', 'Verify against criteria'];
    }

    /**
     * Create an inbox item for the completed PM Copilot plan.
     *
     * @param  array<int, array<string, mixed>>  $alternatives
     * @param  array<int, array<string, mixed>>  $taskBreakdown
     */
    private function createInboxItem(AgentWorkflowState $state, array $alternatives, array $taskBreakdown): void
    {
        $input = $state->state_data['input'] ?? [];
        $workOrderId = $input['work_order_id'] ?? null;

        if ($workOrderId === null) {
            return;
        }

        $workOrder = WorkOrder::with('project')->find($workOrderId);
        if ($workOrder === null) {
            return;
        }

        $agent = $state->agent;
        $topConfidence = $alternatives[0]['confidence'] ?? 'medium';

        InboxItem::create([
            'team_id' => $input['team_id'] ?? $workOrder->team_id,
            'type' => InboxItemType::Approval,
            'title' => "PM Copilot: Plan generated for {$workOrder->title}",
            'content_preview' => $this->buildContentPreview($alternatives, $taskBreakdown),
            'full_content' => $this->buildInboxContent($alternatives, $taskBreakdown),
            'source_type' => SourceType::AIAgent,
            'source_id' => $agent ? "agent-{$agent->id}" : 'agent-pm-copilot',
            'source_name' => $agent->name ?? 'PM Copilot',
            'approvable_type' => AgentWorkflowState::class,
            'approvable_id' => $state->id,
            'related_work_order_id' => $workOrder->id,
            'related_work_order_title' => $workOrder->title,
            'related_project_id' => $workOrder->project?->id,
            'related_project_name' => $workOrder->project?->name,
            'ai_confidence' => AIConfidence::tryFrom($topConfidence) ?? AIConfidence::Medium,
            'urgency' => Urgency::Normal,
        ]);
    }

    /**
     * Build a summary preview for the inbox item.
     *
     * @param  array<int, array<string, mixed>>  $alternatives
     * @param  array<int, array<string, mixed>>  $taskBreakdown
     */
    private function buildContentPreview(array $alternatives, array $taskBreakdown): string
    {
        $altCount = count($alternatives);
        $deliverableCount = 0;
        foreach ($alternatives as $alt) {
            $deliverableCount += count($alt['deliverables'] ?? []);
        }
        $taskCount = 0;
        foreach ($taskBreakdown as $breakdown) {
            $taskCount += count($breakdown['tasks'] ?? []);
        }

        return "{$altCount} alternative(s) with {$deliverableCount} deliverable(s) and {$taskCount} task(s) suggested";
    }

    /**
     * Build rich Markdown content summarizing all alternatives.
     *
     * @param  array<int, array<string, mixed>>  $alternatives
     * @param  array<int, array<string, mixed>>  $taskBreakdown
     */
    private function buildInboxContent(array $alternatives, array $taskBreakdown): string
    {
        $lines = [];

        foreach ($alternatives as $index => $alt) {
            $number = $index + 1;
            $name = $alt['name'] ?? "Alternative {$number}";
            $confidence = $alt['confidence'] ?? 'unknown';
            $lines[] = "## Alternative {$number}: {$name} ({$confidence} confidence)";
            $lines[] = '';

            $deliverables = $alt['deliverables'] ?? [];
            if (! empty($deliverables)) {
                $lines[] = '### Deliverables';
                foreach ($deliverables as $deliverable) {
                    $type = $deliverable['type'] ?? 'deliverable';
                    $lines[] = "- {$deliverable['title']} ({$type})";
                }
                $lines[] = '';
            }

            // Find matching task breakdown for this alternative's deliverables
            foreach ($deliverables as $deliverable) {
                foreach ($taskBreakdown as $breakdown) {
                    if (($breakdown['deliverable_title'] ?? '') === ($deliverable['title'] ?? '')) {
                        $lines[] = '### Tasks';
                        foreach ($breakdown['tasks'] ?? [] as $task) {
                            $hours = $task['estimated_hours'] ?? 0;
                            $lines[] = "- {$task['title']} — {$hours}h";
                        }
                        $lines[] = '';

                        break;
                    }
                }
            }

            $lines[] = '---';
            $lines[] = '';
        }

        return implode("\n", $lines);
    }

    /**
     * Merge additional data into the workflow state.
     *
     * @param  AgentWorkflowState  $state  The workflow state to update
     * @param  array<string, mixed>  $data  The data to merge into state_data
     */
    protected function mergeStateData(AgentWorkflowState $state, array $data): void
    {
        $stateData = $state->state_data ?? [];
        $stateData = array_merge($stateData, $data);
        $state->update(['state_data' => $stateData]);
    }
}

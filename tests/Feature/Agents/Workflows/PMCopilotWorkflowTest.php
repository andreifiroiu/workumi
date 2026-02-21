<?php

declare(strict_types=1);

use App\Agents\Workflows\PMCopilotWorkflow;
use App\Enums\AgentType;
use App\Enums\InboxItemType;
use App\Models\AgentActivityLog;
use App\Models\AgentConfiguration;
use App\Models\AgentWorkflowState;
use App\Models\AIAgent;
use App\Models\GlobalAISettings;
use App\Models\InboxItem;
use App\Models\Party;
use App\Models\Project;
use App\Models\User;
use App\Models\WorkOrder;
use App\Services\AgentApprovalService;
use App\Services\AgentOrchestrator;
use App\Services\AgentRunner;

beforeEach(function () {
    $this->user = User::factory()->create([
        'capacity_hours_per_week' => 40,
        'current_workload_hours' => 20,
    ]);
    $this->team = $this->user->createTeam(['name' => 'Test Team']);
    $this->user->current_team_id = $this->team->id;
    $this->user->save();

    $this->party = Party::factory()->create(['team_id' => $this->team->id]);
    $this->project = Project::factory()->create([
        'team_id' => $this->team->id,
        'party_id' => $this->party->id,
        'owner_id' => $this->user->id,
        'name' => 'Test Project',
    ]);

    $this->workOrder = WorkOrder::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
        'created_by_id' => $this->user->id,
        'title' => 'Test Work Order',
        'description' => 'A detailed work order description for testing PM Copilot.',
        'acceptance_criteria' => ['Criteria 1', 'Criteria 2'],
    ]);

    $this->agent = AIAgent::factory()->create([
        'code' => 'pm-copilot-agent',
        'name' => 'PM Copilot Agent',
        'type' => AgentType::ProjectManagement,
        'description' => 'Assists with project management tasks',
        'tools' => ['deliverable_generation', 'task_breakdown', 'project_insights'],
    ]);

    $this->config = AgentConfiguration::create([
        'team_id' => $this->team->id,
        'ai_agent_id' => $this->agent->id,
        'enabled' => true,
        'daily_run_limit' => 50,
        'monthly_budget_cap' => 100.00,
        'current_month_spend' => 0.00,
        'daily_spend' => 0.00,
        'can_create_work_orders' => true,
        'can_modify_tasks' => true,
        'can_access_client_data' => true,
        'can_send_emails' => false,
        'can_modify_deliverables' => true,
        'can_access_financial_data' => false,
        'can_modify_playbooks' => true,
    ]);

    $this->globalSettings = GlobalAISettings::create([
        'team_id' => $this->team->id,
        'total_monthly_budget' => 1000.00,
        'current_month_spend' => 0.00,
        'require_approval_external_sends' => true,
        'require_approval_financial' => true,
        'require_approval_contracts' => true,
        'require_approval_scope_changes' => false,
    ]);

    $this->orchestrator = new AgentOrchestrator;
    $this->approvalService = new AgentApprovalService($this->orchestrator);
});

test('PMCopilotWorkflow defineSteps returns correct callable array', function () {
    $workflow = new PMCopilotWorkflow($this->orchestrator, $this->approvalService);

    // Use reflection to access protected method
    $reflection = new ReflectionClass($workflow);
    $method = $reflection->getMethod('defineSteps');
    $method->setAccessible(true);

    $steps = $method->invoke($workflow);

    expect($steps)->toBeArray();
    expect($steps)->toHaveKeys([
        'gather_context',
        'generate_deliverables',
        'checkpoint_deliverables',
        'generate_task_breakdown',
        'generate_insights',
        'present_results',
    ]);

    // Verify each step is callable
    foreach ($steps as $stepName => $handler) {
        expect($handler)->toBeCallable();
    }
});

test('PMCopilotWorkflow start with valid input creates state', function () {
    $workflow = new PMCopilotWorkflow($this->orchestrator, $this->approvalService);

    $input = [
        'work_order_id' => $this->workOrder->id,
        'team_id' => $this->team->id,
        'pm_copilot_mode' => 'full',
    ];

    $state = $workflow->start($input, $this->team, $this->agent);

    expect($state)->toBeInstanceOf(AgentWorkflowState::class);
    expect($state->team_id)->toBe($this->team->id);
    expect($state->ai_agent_id)->toBe($this->agent->id);
    expect($state->workflow_class)->toBe(PMCopilotWorkflow::class);
    expect($state->current_node)->toBe('start');
    expect($state->state_data['input'])->toBe($input);
    expect($state->isCompleted())->toBeFalse();
});

test('PMCopilotWorkflow pause for approval creates InboxItem', function () {
    $workflow = new PMCopilotWorkflow($this->orchestrator, $this->approvalService);

    $input = [
        'work_order_id' => $this->workOrder->id,
        'team_id' => $this->team->id,
        'pm_copilot_mode' => 'staged',
    ];

    $state = $workflow->start($input, $this->team, $this->agent);

    // Execute steps until we hit the checkpoint
    $workflow->run();

    $state->refresh();

    // In staged mode, workflow should pause at checkpoint_deliverables step
    expect($state->isPaused())->toBeTrue();
    expect($state->approval_required)->toBeTrue();

    // Verify an InboxItem was created for approval
    $inboxItem = InboxItem::where('approvable_type', AgentWorkflowState::class)
        ->where('approvable_id', $state->id)
        ->where('type', InboxItemType::Approval)
        ->first();

    expect($inboxItem)->not->toBeNull();
    expect($inboxItem->team_id)->toBe($this->team->id);
});

test('PMCopilotWorkflow resume from checkpoint continues workflow', function () {
    $workflow = new PMCopilotWorkflow($this->orchestrator, $this->approvalService);

    $input = [
        'work_order_id' => $this->workOrder->id,
        'team_id' => $this->team->id,
        'pm_copilot_mode' => 'staged',
    ];

    $state = $workflow->start($input, $this->team, $this->agent);
    $workflow->run();

    $state->refresh();
    expect($state->isPaused())->toBeTrue();

    // Resume the workflow with approval data
    $approvalData = [
        'approved' => true,
        'approver_id' => $this->user->id,
        'approved_deliverables' => [
            ['title' => 'Deliverable 1', 'approved' => true],
            ['title' => 'Deliverable 2', 'approved' => false],
        ],
    ];

    $workflow->resume($state, $approvalData);

    $state->refresh();
    expect($state->isPaused())->toBeFalse();
    expect($state->state_data['approval_data'])->toBe($approvalData);

    // Continue running the workflow
    $workflow->run();

    $state->refresh();
    expect($state->isCompleted())->toBeTrue();
});

test('PMCopilotWorkflow staged mode pauses after deliverables step', function () {
    $workflow = new PMCopilotWorkflow($this->orchestrator, $this->approvalService);

    $input = [
        'work_order_id' => $this->workOrder->id,
        'team_id' => $this->team->id,
        'pm_copilot_mode' => 'staged',
    ];

    $state = $workflow->start($input, $this->team, $this->agent);
    $workflow->run();

    $state->refresh();

    // Staged mode should pause at checkpoint_deliverables step
    expect($state->isPaused())->toBeTrue();
    expect($state->current_node)->toBe('checkpoint_deliverables');
});

test('PMCopilotWorkflow full mode skips checkpoint and completes', function () {
    $workflow = new PMCopilotWorkflow($this->orchestrator, $this->approvalService);

    $input = [
        'work_order_id' => $this->workOrder->id,
        'team_id' => $this->team->id,
        'pm_copilot_mode' => 'full',
    ];

    $state = $workflow->start($input, $this->team, $this->agent);
    $workflow->run();

    $state->refresh();

    // Full mode should complete without pausing
    expect($state->isPaused())->toBeFalse();
    expect($state->isCompleted())->toBeTrue();
    expect($state->current_node)->toBe('completed');
});

test('PMCopilotWorkflow uses LLM for deliverables when AgentRunner is provided', function () {
    $llmJson = json_encode([
        'alternatives' => [
            [
                'alternative_id' => 1,
                'name' => 'LLM-Generated Approach',
                'deliverables' => [
                    [
                        'title' => 'AI-Planned Deliverable',
                        'description' => 'Generated by the LLM based on context analysis.',
                        'type' => 'document',
                        'acceptance_criteria' => ['AI criterion 1'],
                        'confidence' => 'high',
                    ],
                ],
                'confidence' => 'high',
                'reasoning' => 'This approach was generated by the LLM.',
            ],
        ],
    ]);

    $activityLog = new AgentActivityLog([
        'team_id' => $this->team->id,
        'ai_agent_id' => $this->agent->id,
        'run_type' => 'agent_run',
        'input' => '{}',
        'output' => "```json\n{$llmJson}\n```",
        'error' => null,
        'tokens_used' => 100,
        'cost' => 0.01,
        'duration_ms' => 500,
    ]);

    $mockRunner = Mockery::mock(AgentRunner::class);
    $mockRunner->shouldReceive('runWithPrompt')
        ->andReturn($activityLog);

    $workflow = new PMCopilotWorkflow($this->orchestrator, $this->approvalService, $mockRunner);

    $input = [
        'work_order_id' => $this->workOrder->id,
        'team_id' => $this->team->id,
        'pm_copilot_mode' => 'full',
    ];

    $state = $workflow->start($input, $this->team, $this->agent);
    $workflow->run();

    $state->refresh();

    expect($state->isCompleted())->toBeTrue();

    $alternatives = $state->state_data['deliverable_alternatives'] ?? [];
    expect($alternatives)->toHaveCount(1);
    expect($alternatives[0]['name'])->toBe('LLM-Generated Approach');
    expect($alternatives[0]['deliverables'][0]['title'])->toBe('AI-Planned Deliverable');
});

test('PMCopilotWorkflow falls back to hardcoded logic when LLM returns invalid JSON', function () {
    $activityLog = new AgentActivityLog([
        'team_id' => $this->team->id,
        'ai_agent_id' => $this->agent->id,
        'run_type' => 'agent_run',
        'input' => '{}',
        'output' => 'This is not valid JSON at all.',
        'error' => null,
        'tokens_used' => 50,
        'cost' => 0.005,
        'duration_ms' => 300,
    ]);

    $mockRunner = Mockery::mock(AgentRunner::class);
    $mockRunner->shouldReceive('runWithPrompt')
        ->andReturn($activityLog);

    $workflow = new PMCopilotWorkflow($this->orchestrator, $this->approvalService, $mockRunner);

    $input = [
        'work_order_id' => $this->workOrder->id,
        'team_id' => $this->team->id,
        'pm_copilot_mode' => 'full',
    ];

    $state = $workflow->start($input, $this->team, $this->agent);
    $workflow->run();

    $state->refresh();

    expect($state->isCompleted())->toBeTrue();

    // Should fall back to hardcoded alternatives
    $alternatives = $state->state_data['deliverable_alternatives'] ?? [];
    expect($alternatives)->not->toBeEmpty();
    expect($alternatives[0]['name'])->toBe('Standard Approach');
});

test('PMCopilotWorkflow falls back to hardcoded logic when AgentRunner is null', function () {
    $workflow = new PMCopilotWorkflow($this->orchestrator, $this->approvalService, null);

    $input = [
        'work_order_id' => $this->workOrder->id,
        'team_id' => $this->team->id,
        'pm_copilot_mode' => 'full',
    ];

    $state = $workflow->start($input, $this->team, $this->agent);
    $workflow->run();

    $state->refresh();

    expect($state->isCompleted())->toBeTrue();

    // Should use hardcoded alternatives
    $alternatives = $state->state_data['deliverable_alternatives'] ?? [];
    expect($alternatives)->not->toBeEmpty();
    expect($alternatives[0]['name'])->toBe('Standard Approach');

    // Should use hardcoded task breakdown for all alternatives
    $taskBreakdownByAlt = $state->state_data['task_breakdown_by_alternative'] ?? [];
    expect($taskBreakdownByAlt)->not->toBeEmpty();

    // Each alternative should have its own task breakdown
    foreach ($alternatives as $alt) {
        $altId = (string) ($alt['alternative_id'] ?? '');
        expect($taskBreakdownByAlt)->toHaveKey($altId);
        expect($taskBreakdownByAlt[$altId])->not->toBeEmpty();
    }

    // Flat task_breakdown should also be present (backward compat)
    $taskBreakdown = $state->state_data['task_breakdown'] ?? [];
    expect($taskBreakdown)->not->toBeEmpty();
});

test('PMCopilotWorkflow falls back when LLM call returns error', function () {
    $activityLog = new AgentActivityLog([
        'team_id' => $this->team->id,
        'ai_agent_id' => $this->agent->id,
        'run_type' => 'agent_run',
        'input' => '{}',
        'output' => null,
        'error' => 'Budget exceeded',
        'tokens_used' => 0,
        'cost' => 0.0,
        'duration_ms' => 100,
    ]);

    $mockRunner = Mockery::mock(AgentRunner::class);
    $mockRunner->shouldReceive('runWithPrompt')
        ->andReturn($activityLog);

    $workflow = new PMCopilotWorkflow($this->orchestrator, $this->approvalService, $mockRunner);

    $input = [
        'work_order_id' => $this->workOrder->id,
        'team_id' => $this->team->id,
        'pm_copilot_mode' => 'full',
    ];

    $state = $workflow->start($input, $this->team, $this->agent);
    $workflow->run();

    $state->refresh();

    expect($state->isCompleted())->toBeTrue();

    // Should fall back to hardcoded alternatives
    $alternatives = $state->state_data['deliverable_alternatives'] ?? [];
    expect($alternatives)->not->toBeEmpty();
    expect($alternatives[0]['name'])->toBe('Standard Approach');
});

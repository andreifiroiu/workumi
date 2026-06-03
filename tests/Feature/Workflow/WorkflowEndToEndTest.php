<?php

declare(strict_types=1);

/**
 * End-to-End Tests for Human Checkpoint Workflow Feature
 *
 * These tests verify complete workflows from start to finish,
 * ensuring all components work together correctly.
 *
 * Critical workflows covered:
 * 1. Complete task approval workflow (Todo -> Done)
 * 2. Complete work order delivery workflow (Draft -> Delivered)
 * 3. Rejection and revision workflow with required feedback
 * 4. AI agent restrictions (cannot approve or deliver)
 * 5. Timer confirmation flow for completed tasks
 * 6. RACI assignment with audit logging
 * 7. Blocked status workflow
 */

use App\Enums\InboxItemType;
use App\Enums\TaskStatus;
use App\Enums\WorkOrderStatus;
use App\Models\AIAgent;
use App\Models\AuditLog;
use App\Models\InboxItem;
use App\Models\Party;
use App\Models\Project;
use App\Models\Task;
use App\Models\TimeEntry;
use App\Models\User;
use App\Models\WorkOrder;
use App\Services\TimerTransitionService;
use App\Services\WorkflowTransitionService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    // Create team and users
    $this->manager = User::factory()->create();
    $this->team = $this->manager->createTeam(['name' => 'Test Team']);
    $this->manager->current_team_id = $this->team->id;
    $this->manager->save();

    $this->worker = User::factory()->create();
    $this->reviewer = User::factory()->create();

    // Create party and project
    $this->party = Party::factory()->create(['team_id' => $this->team->id]);
    $this->project = Project::factory()->create([
        'team_id' => $this->team->id,
        'party_id' => $this->party->id,
        'owner_id' => $this->manager->id,
        'accountable_id' => $this->reviewer->id,
    ]);

    // Create work order
    $this->workOrder = WorkOrder::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
        'created_by_id' => $this->manager->id,
        'accountable_id' => $this->reviewer->id,
        'status' => WorkOrderStatus::Active,
    ]);

    // Create AI agent
    $this->aiAgent = AIAgent::factory()->create();

    $this->transitionService = new WorkflowTransitionService;
    $this->timerService = new TimerTransitionService;
});

describe('Complete Task Approval Workflow', function () {
    test('task completes full approval workflow: Todo -> InProgress -> InReview -> Approved -> Done', function () {
        $task = Task::factory()->create([
            'team_id' => $this->team->id,
            'work_order_id' => $this->workOrder->id,
            'project_id' => $this->project->id,
            'created_by_id' => $this->worker->id,
            'assigned_to_id' => $this->worker->id,
            'reviewer_id' => $this->reviewer->id, // Deterministic reviewer for approval validation
            'status' => TaskStatus::Todo,
        ]);

        // Step 1: Todo -> InProgress (worker starts work)
        $transition1 = $this->transitionService->transition(
            item: $task,
            actor: $this->worker,
            toStatus: TaskStatus::InProgress,
        );
        expect($transition1->to_status)->toBe('in_progress');
        $task->refresh();
        expect($task->status)->toBe(TaskStatus::InProgress);

        // Step 2: InProgress -> InReview (worker submits for review)
        $transition2 = $this->transitionService->transition(
            item: $task,
            actor: $this->worker,
            toStatus: TaskStatus::InReview,
        );
        expect($transition2->to_status)->toBe('in_review');
        $task->refresh();
        expect($task->status)->toBe(TaskStatus::InReview);

        // Verify InboxItem was created
        $inboxItem = InboxItem::where('approvable_type', Task::class)
            ->where('approvable_id', $task->id)
            ->first();
        expect($inboxItem)->not->toBeNull();
        expect($inboxItem->type)->toBe(InboxItemType::Approval);

        // Step 3: InReview -> Approved (reviewer approves)
        $transition3 = $this->transitionService->transition(
            item: $task,
            actor: $this->reviewer,
            toStatus: TaskStatus::Approved,
        );
        expect($transition3->to_status)->toBe('approved');
        $task->refresh();
        expect($task->status)->toBe(TaskStatus::Approved);

        // Verify InboxItem was resolved
        $inboxItem->refresh();
        expect($inboxItem->approved_at)->not->toBeNull();
        expect($inboxItem->deleted_at)->not->toBeNull();

        // Step 4: Approved -> Done (manager delivers)
        $transition4 = $this->transitionService->transition(
            item: $task,
            actor: $this->manager,
            toStatus: TaskStatus::Done,
        );
        expect($transition4->to_status)->toBe('done');
        $task->refresh();
        expect($task->status)->toBe(TaskStatus::Done);

        // Verify all transitions were recorded
        expect($task->statusTransitions)->toHaveCount(4);

        // Verify audit logs were created
        $auditLogs = AuditLog::where('target', 'Task')
            ->where('target_id', (string) $task->id)
            ->where('action', 'status_transition')
            ->get();
        expect($auditLogs->count())->toBe(4);
    });
});

describe('Complete Work Order Delivery Workflow', function () {
    test('work order completes full approval workflow: Draft -> Active -> InReview -> Approved -> Delivered', function () {
        $workOrder = WorkOrder::factory()->create([
            'team_id' => $this->team->id,
            'project_id' => $this->project->id,
            'created_by_id' => $this->manager->id,
            'accountable_id' => $this->reviewer->id,
            'status' => WorkOrderStatus::Draft,
        ]);

        // Step 1: Draft -> Active
        $transition1 = $this->transitionService->transition(
            item: $workOrder,
            actor: $this->manager,
            toStatus: WorkOrderStatus::Active,
        );
        expect($transition1->to_status)->toBe('active');
        $workOrder->refresh();
        expect($workOrder->status)->toBe(WorkOrderStatus::Active);

        // Step 2: Active -> InReview
        $transition2 = $this->transitionService->transition(
            item: $workOrder,
            actor: $this->worker,
            toStatus: WorkOrderStatus::InReview,
        );
        expect($transition2->to_status)->toBe('in_review');
        $workOrder->refresh();
        expect($workOrder->status)->toBe(WorkOrderStatus::InReview);

        // Verify InboxItem was created for WorkOrder
        $inboxItem = InboxItem::where('approvable_type', WorkOrder::class)
            ->where('approvable_id', $workOrder->id)
            ->first();
        expect($inboxItem)->not->toBeNull();

        // Step 3: InReview -> Approved
        $transition3 = $this->transitionService->transition(
            item: $workOrder,
            actor: $this->reviewer,
            toStatus: WorkOrderStatus::Approved,
        );
        expect($transition3->to_status)->toBe('approved');
        $workOrder->refresh();
        expect($workOrder->status)->toBe(WorkOrderStatus::Approved);

        // Step 4: Approved -> Delivered
        $transition4 = $this->transitionService->transition(
            item: $workOrder,
            actor: $this->manager,
            toStatus: WorkOrderStatus::Delivered,
        );
        expect($transition4->to_status)->toBe('delivered');
        $workOrder->refresh();
        expect($workOrder->status)->toBe(WorkOrderStatus::Delivered);

        // Verify complete audit trail
        expect($workOrder->statusTransitions)->toHaveCount(4);
    });
});

describe('Rejection and Revision Workflow', function () {
    test('rejection with feedback auto-transitions to InProgress and creates new InboxItem on resubmit', function () {
        // Start with task in InProgress to properly test the rejection flow
        $task = Task::factory()->create([
            'team_id' => $this->team->id,
            'work_order_id' => $this->workOrder->id,
            'project_id' => $this->project->id,
            'created_by_id' => $this->worker->id,
            'status' => TaskStatus::InProgress,
        ]);

        // Submit for review (InProgress -> InReview)
        $this->transitionService->transition(
            item: $task,
            actor: $this->worker,
            toStatus: TaskStatus::InReview,
        );
        $task->refresh();
        expect($task->status)->toBe(TaskStatus::InReview);

        // Verify initial InboxItem was created
        $initialInboxItem = InboxItem::where('approvable_type', Task::class)
            ->where('approvable_id', $task->id)
            ->first();
        expect($initialInboxItem)->not->toBeNull();

        // Reject with feedback (creates RevisionRequested then auto-transitions)
        $rejectionTransition = $this->transitionService->transition(
            item: $task,
            actor: $this->reviewer,
            toStatus: TaskStatus::RevisionRequested,
            comment: 'Please improve the documentation and fix the formatting.',
        );

        expect($rejectionTransition->comment)->toBe('Please improve the documentation and fix the formatting.');

        $task->refresh();
        // After RevisionRequested, should auto-transition to InProgress
        expect($task->status)->toBe(TaskStatus::InProgress);

        // Verify transitions: InProgress -> InReview -> RevisionRequested -> InProgress (auto)
        // Total of 3 transitions at this point
        expect($task->statusTransitions)->toHaveCount(3);

        // Check the last two transitions by ID order (most reliable)
        $allTransitions = $task->statusTransitions()->orderBy('id', 'asc')->get();

        // First transition: InProgress -> InReview
        expect($allTransitions[0]->from_status)->toBe('in_progress');
        expect($allTransitions[0]->to_status)->toBe('in_review');

        // Second transition: InReview -> RevisionRequested (with comment)
        expect($allTransitions[1]->from_status)->toBe('in_review');
        expect($allTransitions[1]->to_status)->toBe('revision_requested');
        expect($allTransitions[1]->comment)->toBe('Please improve the documentation and fix the formatting.');

        // Third transition: RevisionRequested -> InProgress (auto)
        expect($allTransitions[2]->from_status)->toBe('revision_requested');
        expect($allTransitions[2]->to_status)->toBe('in_progress');

        // Verify initial InboxItem was resolved (rejected)
        $initialInboxItem->refresh();
        expect($initialInboxItem->rejected_at)->not->toBeNull();
        expect($initialInboxItem->deleted_at)->not->toBeNull();

        // Worker makes changes and resubmits
        $resubmitTransition = $this->transitionService->transition(
            item: $task,
            actor: $this->worker,
            toStatus: TaskStatus::InReview,
        );
        expect($resubmitTransition->to_status)->toBe('in_review');

        // Verify new InboxItem was created for second review
        $newInboxItem = InboxItem::where('approvable_type', Task::class)
            ->where('approvable_id', $task->id)
            ->whereNull('deleted_at')
            ->first();
        expect($newInboxItem)->not->toBeNull();
        expect($newInboxItem->id)->not->toBe($initialInboxItem->id);
    });
});

describe('AI Agent Workflow Restrictions', function () {
    test('AI agent is blocked from approval and delivery transitions', function () {
        // Test Task restrictions
        $taskInReview = Task::factory()->create([
            'team_id' => $this->team->id,
            'work_order_id' => $this->workOrder->id,
            'project_id' => $this->project->id,
            'created_by_id' => $this->manager->id,
            'reviewer_id' => $this->reviewer->id, // Explicitly set reviewer for approval validation
            'status' => TaskStatus::InReview,
        ]);

        // AI agent CANNOT approve (InReview to Approved)
        expect($this->transitionService->canTransition(
            item: $taskInReview,
            actor: $this->aiAgent,
            toStatus: TaskStatus::Approved,
        ))->toBeFalse();

        // But designated reviewer CAN approve
        expect($this->transitionService->canTransition(
            item: $taskInReview,
            actor: $this->reviewer,
            toStatus: TaskStatus::Approved,
        ))->toBeTrue();

        // Test Approved to Done restriction
        $taskApproved = Task::factory()->create([
            'team_id' => $this->team->id,
            'work_order_id' => $this->workOrder->id,
            'project_id' => $this->project->id,
            'created_by_id' => $this->manager->id,
            'status' => TaskStatus::Approved,
        ]);

        // AI agent CANNOT deliver (Approved to Done)
        expect($this->transitionService->canTransition(
            item: $taskApproved,
            actor: $this->aiAgent,
            toStatus: TaskStatus::Done,
        ))->toBeFalse();

        // But human CAN deliver
        expect($this->transitionService->canTransition(
            item: $taskApproved,
            actor: $this->manager,
            toStatus: TaskStatus::Done,
        ))->toBeTrue();

        // Verify getAvailableTransitions excludes restricted transitions for AI
        $aiAvailableTransitions = $this->transitionService->getAvailableTransitions($taskInReview, $this->aiAgent);
        expect($aiAvailableTransitions)->not->toContain('approved');
        expect($aiAvailableTransitions)->toContain('revision_requested');
        expect($aiAvailableTransitions)->toContain('cancelled');

        // Human should see all available transitions
        $humanAvailableTransitions = $this->transitionService->getAvailableTransitions($taskInReview, $this->reviewer);
        expect($humanAvailableTransitions)->toContain('approved');
        expect($humanAvailableTransitions)->toContain('revision_requested');
        expect($humanAvailableTransitions)->toContain('cancelled');
    });

    test('AI agent is blocked from work order approval and delivery', function () {
        // Test WorkOrder InReview -> Approved restriction
        $workOrderInReview = WorkOrder::factory()->create([
            'team_id' => $this->team->id,
            'project_id' => $this->project->id,
            'created_by_id' => $this->manager->id,
            'accountable_id' => $this->reviewer->id,
            'status' => WorkOrderStatus::InReview,
        ]);

        // AI agent CANNOT approve work order
        expect($this->transitionService->canTransition(
            item: $workOrderInReview,
            actor: $this->aiAgent,
            toStatus: WorkOrderStatus::Approved,
        ))->toBeFalse();

        // Test WorkOrder Approved -> Delivered restriction
        $workOrderApproved = WorkOrder::factory()->create([
            'team_id' => $this->team->id,
            'project_id' => $this->project->id,
            'created_by_id' => $this->manager->id,
            'accountable_id' => $this->reviewer->id,
            'status' => WorkOrderStatus::Approved,
        ]);

        // AI agent CANNOT deliver work order
        expect($this->transitionService->canTransition(
            item: $workOrderApproved,
            actor: $this->aiAgent,
            toStatus: WorkOrderStatus::Delivered,
        ))->toBeFalse();

        // But human CAN deliver
        expect($this->transitionService->canTransition(
            item: $workOrderApproved,
            actor: $this->manager,
            toStatus: WorkOrderStatus::Delivered,
        ))->toBeTrue();
    });
});

describe('Timer Confirmation Flow', function () {
    test('starting timer on Done task requires confirmation and transitions to InProgress', function () {
        $task = Task::factory()->create([
            'team_id' => $this->team->id,
            'work_order_id' => $this->workOrder->id,
            'project_id' => $this->project->id,
            'created_by_id' => $this->worker->id,
            'status' => TaskStatus::Done,
        ]);

        // Initial check without confirmation should return confirmation_required
        $result = $this->timerService->checkAndStartTimer($task, $this->worker);

        expect($result['status'])->toBe('confirmation_required');
        expect($result['current_status'])->toBe('done');
        expect($result['reason'])->toContain('Done');

        // Task should still be Done
        $task->refresh();
        expect($task->status)->toBe(TaskStatus::Done);

        // No timer should be started yet
        expect(TimeEntry::where('task_id', $task->id)->count())->toBe(0);

        // Confirm and start timer
        $timeEntry = $this->timerService->confirmAndStartTimer($task, $this->worker);

        expect($timeEntry)->toBeInstanceOf(TimeEntry::class);
        expect($timeEntry->task_id)->toBe($task->id);
        expect($timeEntry->user_id)->toBe($this->worker->id);
        expect($timeEntry->started_at)->not->toBeNull();

        // Task should now be InProgress
        $task->refresh();
        expect($task->status)->toBe(TaskStatus::InProgress);

        // Status transition should be recorded
        $transition = $task->statusTransitions->first();
        expect($transition->from_status)->toBe('done');
        expect($transition->to_status)->toBe('in_progress');
    });
});

describe('RACI Assignment with Audit Logging', function () {
    test('RACI changes are logged to audit trail and confirmation required for existing values', function () {
        $newAccountable = User::factory()->create();
        $newResponsible = User::factory()->create();

        // Update RACI via API
        $response = $this->actingAs($this->manager)
            ->patchJson(route('projects.raci', $this->project), [
                'accountable_id' => $newAccountable->id,
                'responsible_id' => $newResponsible->id,
                'consulted_ids' => [$this->worker->id],
                'informed_ids' => [$this->reviewer->id],
                'confirmed' => true,
            ]);

        $response->assertStatus(200);

        // Verify database was updated
        $this->project->refresh();
        expect($this->project->accountable_id)->toBe($newAccountable->id);
        expect($this->project->responsible_id)->toBe($newResponsible->id);
        expect($this->project->consulted_ids)->toContain($this->worker->id);
        expect($this->project->informed_ids)->toContain($this->reviewer->id);

        // Verify audit log was created
        $auditLog = AuditLog::where('target', 'Project')
            ->where('target_id', (string) $this->project->id)
            ->where('action', 'raci_updated')
            ->first();

        expect($auditLog)->not->toBeNull();
        expect($auditLog->actor_name)->toBe($this->manager->name);
        expect($auditLog->details)->toContain('accountable_id');
    });

    test('changing existing RACI assignment requires confirmation', function () {
        // First set RACI values
        $this->project->update([
            'responsible_id' => $this->worker->id,
        ]);

        // Try to change without confirmation
        $response = $this->actingAs($this->manager)
            ->patchJson(route('projects.raci', $this->project), [
                'accountable_id' => $this->project->accountable_id,
                'responsible_id' => $this->reviewer->id, // Changing existing value
                'confirmed' => false,
            ]);

        $response->assertStatus(200);
        $response->assertJsonPath('confirmation_required', true);

        // Verify database was NOT updated
        $this->project->refresh();
        expect($this->project->responsible_id)->toBe($this->worker->id);
    });
});

describe('Blocked Status Workflow', function () {
    test('task can be blocked from InProgress and unblocked back to InProgress', function () {
        $task = Task::factory()->create([
            'team_id' => $this->team->id,
            'work_order_id' => $this->workOrder->id,
            'project_id' => $this->project->id,
            'created_by_id' => $this->worker->id,
            'status' => TaskStatus::InProgress,
        ]);

        // Block the task
        $blockTransition = $this->transitionService->transition(
            item: $task,
            actor: $this->worker,
            toStatus: TaskStatus::Blocked,
        );
        expect($blockTransition->to_status)->toBe('blocked');
        $task->refresh();
        expect($task->status)->toBe(TaskStatus::Blocked);

        // Unblock the task (Blocked -> InProgress)
        $unblockTransition = $this->transitionService->transition(
            item: $task,
            actor: $this->manager,
            toStatus: TaskStatus::InProgress,
        );
        expect($unblockTransition->to_status)->toBe('in_progress');
        $task->refresh();
        expect($task->status)->toBe(TaskStatus::InProgress);

        // Verify transitions recorded
        expect($task->statusTransitions)->toHaveCount(2);
    });

    test('work order can be blocked from Active and unblocked back to Active', function () {
        $workOrder = WorkOrder::factory()->create([
            'team_id' => $this->team->id,
            'project_id' => $this->project->id,
            'created_by_id' => $this->manager->id,
            'accountable_id' => $this->reviewer->id,
            'status' => WorkOrderStatus::Active,
        ]);

        // Block the work order
        $blockTransition = $this->transitionService->transition(
            item: $workOrder,
            actor: $this->worker,
            toStatus: WorkOrderStatus::Blocked,
        );
        expect($blockTransition->to_status)->toBe('blocked');
        $workOrder->refresh();
        expect($workOrder->status)->toBe(WorkOrderStatus::Blocked);

        // Unblock the work order (Blocked -> Active)
        $unblockTransition = $this->transitionService->transition(
            item: $workOrder,
            actor: $this->manager,
            toStatus: WorkOrderStatus::Active,
        );
        expect($unblockTransition->to_status)->toBe('active');
        $workOrder->refresh();
        expect($workOrder->status)->toBe(WorkOrderStatus::Active);

        // Verify transitions recorded
        expect($workOrder->statusTransitions)->toHaveCount(2);
    });
});

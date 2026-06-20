<?php

declare(strict_types=1);

use App\Enums\TaskStatus;
use App\Enums\WorkOrderStatus;
use App\Exceptions\InvalidTransitionException;
use App\Models\AIAgent;
use App\Models\InboxItem;
use App\Models\Party;
use App\Models\Project;
use App\Models\StatusTransition;
use App\Models\Task;
use App\Models\User;
use App\Models\WorkOrder;
use App\Services\WorkflowTransitionService;

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->team = $this->user->createTeam(['name' => 'Test Team']);
    $this->user->current_team_id = $this->team->id;
    $this->user->save();

    $this->party = Party::factory()->create(['team_id' => $this->team->id]);
    $this->project = Project::factory()->create([
        'team_id' => $this->team->id,
        'party_id' => $this->party->id,
        'owner_id' => $this->user->id,
    ]);
    $this->workOrder = WorkOrder::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
        'created_by_id' => $this->user->id,
        'accountable_id' => $this->user->id,
    ]);

    $this->service = new WorkflowTransitionService;
});

test('valid transitions are allowed for tasks', function () {
    $task = Task::factory()->create([
        'team_id' => $this->team->id,
        'work_order_id' => $this->workOrder->id,
        'project_id' => $this->project->id,
        'created_by_id' => $this->user->id,
        'status' => TaskStatus::Todo,
    ]);

    $transition = $this->service->transition(
        item: $task,
        actor: $this->user,
        toStatus: TaskStatus::InProgress,
    );

    expect($transition)->toBeInstanceOf(StatusTransition::class);
    expect($transition->from_status)->toBe(TaskStatus::Todo->value);
    expect($transition->to_status)->toBe(TaskStatus::InProgress->value);

    $task->refresh();
    expect($task->status)->toBe(TaskStatus::InProgress);
});

test('invalid transitions are rejected for tasks', function () {
    $task = Task::factory()->create([
        'team_id' => $this->team->id,
        'work_order_id' => $this->workOrder->id,
        'project_id' => $this->project->id,
        'created_by_id' => $this->user->id,
        'status' => TaskStatus::Todo,
    ]);

    $this->service->transition(
        item: $task,
        actor: $this->user,
        toStatus: TaskStatus::Approved,
    );
})->throws(InvalidTransitionException::class);

test('AI agents cannot approve work', function () {
    $task = Task::factory()->create([
        'team_id' => $this->team->id,
        'work_order_id' => $this->workOrder->id,
        'project_id' => $this->project->id,
        'created_by_id' => $this->user->id,
        'status' => TaskStatus::InReview,
    ]);

    $aiAgent = AIAgent::factory()->create();

    $this->service->transition(
        item: $task,
        actor: $aiAgent,
        toStatus: TaskStatus::Approved,
    );
})->throws(InvalidTransitionException::class, 'AI agents cannot perform');

test('AI agents cannot deliver work', function () {
    $task = Task::factory()->create([
        'team_id' => $this->team->id,
        'work_order_id' => $this->workOrder->id,
        'project_id' => $this->project->id,
        'created_by_id' => $this->user->id,
        'status' => TaskStatus::Approved,
    ]);

    $aiAgent = AIAgent::factory()->create();

    $this->service->transition(
        item: $task,
        actor: $aiAgent,
        toStatus: TaskStatus::Done,
    );
})->throws(InvalidTransitionException::class, 'AI agents cannot perform');

test('managers can approve work', function () {
    $task = Task::factory()->create([
        'team_id' => $this->team->id,
        'work_order_id' => $this->workOrder->id,
        'project_id' => $this->project->id,
        'created_by_id' => $this->user->id,
        'status' => TaskStatus::InReview,
    ]);

    $transition = $this->service->transition(
        item: $task,
        actor: $this->user,
        toStatus: TaskStatus::Approved,
    );

    expect($transition)->toBeInstanceOf(StatusTransition::class);
    expect($transition->to_status)->toBe(TaskStatus::Approved->value);

    $task->refresh();
    expect($task->status)->toBe(TaskStatus::Approved);
});

test('rejection requires comment', function () {
    $task = Task::factory()->create([
        'team_id' => $this->team->id,
        'work_order_id' => $this->workOrder->id,
        'project_id' => $this->project->id,
        'created_by_id' => $this->user->id,
        'status' => TaskStatus::InReview,
    ]);

    $this->service->transition(
        item: $task,
        actor: $this->user,
        toStatus: TaskStatus::RevisionRequested,
    );
})->throws(InvalidTransitionException::class, 'comment is required');

test('rejection with comment succeeds and auto-transitions to InProgress', function () {
    $task = Task::factory()->create([
        'team_id' => $this->team->id,
        'work_order_id' => $this->workOrder->id,
        'project_id' => $this->project->id,
        'created_by_id' => $this->user->id,
        'status' => TaskStatus::InReview,
    ]);

    $transition = $this->service->transition(
        item: $task,
        actor: $this->user,
        toStatus: TaskStatus::RevisionRequested,
        comment: 'Please fix the formatting issues.',
    );

    expect($transition)->toBeInstanceOf(StatusTransition::class);
    expect($transition->comment)->toBe('Please fix the formatting issues.');

    $task->refresh();
    // After RevisionRequested, it auto-transitions to InProgress
    expect($task->status)->toBe(TaskStatus::InProgress);

    // Should have 2 transitions: InReview -> RevisionRequested -> InProgress
    expect($task->statusTransitions)->toHaveCount(2);
});

test('work order rejection auto-transitions to Active', function () {
    $workOrder = WorkOrder::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
        'created_by_id' => $this->user->id,
        'accountable_id' => $this->user->id,
        'status' => WorkOrderStatus::InReview,
    ]);

    $transition = $this->service->transition(
        item: $workOrder,
        actor: $this->user,
        toStatus: WorkOrderStatus::RevisionRequested,
        comment: 'Needs more work on deliverables.',
    );

    expect($transition)->toBeInstanceOf(StatusTransition::class);
    expect($transition->comment)->toBe('Needs more work on deliverables.');

    $workOrder->refresh();
    // After RevisionRequested, it auto-transitions to Active
    expect($workOrder->status)->toBe(WorkOrderStatus::Active);

    // Should have 2 transitions: InReview -> RevisionRequested -> Active
    expect($workOrder->statusTransitions)->toHaveCount(2);
});

test('a work order can be moved to backlog from any status', function (WorkOrderStatus $from) {
    $workOrder = WorkOrder::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
        'created_by_id' => $this->user->id,
        'accountable_id' => $this->user->id,
        'status' => $from,
    ]);

    $this->service->transition(
        item: $workOrder,
        actor: $this->user,
        toStatus: WorkOrderStatus::Backlog,
    );

    $workOrder->refresh();
    expect($workOrder->status)->toBe(WorkOrderStatus::Backlog);
})->with([
    'draft' => WorkOrderStatus::Draft,
    'active' => WorkOrderStatus::Active,
    'in_review' => WorkOrderStatus::InReview,
    'approved' => WorkOrderStatus::Approved,
    'delivered' => WorkOrderStatus::Delivered,
    'blocked' => WorkOrderStatus::Blocked,
    'cancelled' => WorkOrderStatus::Cancelled,
    'revision_requested' => WorkOrderStatus::RevisionRequested,
]);

test('a backlogged work order can be moved to any status', function (WorkOrderStatus $to) {
    $workOrder = WorkOrder::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
        'created_by_id' => $this->user->id,
        'accountable_id' => $this->user->id,
        'status' => WorkOrderStatus::Backlog,
    ]);

    expect($this->service->canTransition($workOrder, $this->user, $to))->toBeTrue();
})->with([
    'draft' => WorkOrderStatus::Draft,
    'active' => WorkOrderStatus::Active,
    'delivered' => WorkOrderStatus::Delivered,
]);

test('backlogging an in-review work order clears its pending approval', function () {
    $workOrder = WorkOrder::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
        'created_by_id' => $this->user->id,
        'accountable_id' => $this->user->id,
        'status' => WorkOrderStatus::Active,
    ]);

    $this->service->transition(
        item: $workOrder,
        actor: $this->user,
        toStatus: WorkOrderStatus::InReview,
    );

    expect(InboxItem::findPendingApprovalFor($workOrder))->not->toBeNull();

    $this->service->transition(
        item: $workOrder->fresh(),
        actor: $this->user,
        toStatus: WorkOrderStatus::Backlog,
    );

    expect(InboxItem::findPendingApprovalFor($workOrder))->toBeNull();
});

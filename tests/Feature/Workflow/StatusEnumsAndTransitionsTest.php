<?php

declare(strict_types=1);

use App\Enums\TaskStatus;
use App\Enums\WorkOrderStatus;
use App\Models\Party;
use App\Models\Project;
use App\Models\StatusTransition;
use App\Models\Task;
use App\Models\User;
use App\Models\WorkOrder;

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
    ]);
});

test('TaskStatus enum has all required cases including new workflow statuses', function () {
    $expectedCases = [
        'Todo',
        'InProgress',
        'InReview',
        'Approved',
        'Done',
        'Blocked',
        'Cancelled',
        'RevisionRequested',
    ];

    $actualCases = array_map(fn ($case) => $case->name, TaskStatus::cases());

    foreach ($expectedCases as $expectedCase) {
        expect($actualCases)->toContain($expectedCase);
    }

    expect(count(TaskStatus::cases()))->toBe(9);
});

test('TaskStatus enum has label and color methods for all cases', function () {
    foreach (TaskStatus::cases() as $status) {
        expect($status->label())->toBeString()->not->toBeEmpty();
        expect($status->color())->toBeString()->not->toBeEmpty();
    }

    expect(TaskStatus::InReview->color())->toBe('amber');
    expect(TaskStatus::Approved->color())->toBe('emerald');
    expect(TaskStatus::Blocked->color())->toBe('red');
    expect(TaskStatus::Cancelled->color())->toBe('red');
    expect(TaskStatus::RevisionRequested->color())->toBe('orange');
    expect(TaskStatus::Archived->color())->toBe('slate');
});

test('WorkOrderStatus enum has all required cases including new workflow statuses', function () {
    $expectedCases = [
        'Draft',
        'Active',
        'InReview',
        'Approved',
        'Delivered',
        'Blocked',
        'Cancelled',
        'RevisionRequested',
        'Archived',
        'Backlog',
    ];

    $actualCases = array_map(fn ($case) => $case->name, WorkOrderStatus::cases());

    foreach ($expectedCases as $expectedCase) {
        expect($actualCases)->toContain($expectedCase);
    }

    expect(count(WorkOrderStatus::cases()))->toBe(10);
});

test('WorkOrderStatus enum has label and color methods for all cases', function () {
    foreach (WorkOrderStatus::cases() as $status) {
        expect($status->label())->toBeString()->not->toBeEmpty();
        expect($status->color())->toBeString()->not->toBeEmpty();
    }

    expect(WorkOrderStatus::Blocked->color())->toBe('red');
    expect(WorkOrderStatus::Cancelled->color())->toBe('red');
    expect(WorkOrderStatus::RevisionRequested->color())->toBe('orange');
});

test('StatusTransition model stores transitions correctly', function () {
    $task = Task::factory()->create([
        'team_id' => $this->team->id,
        'work_order_id' => $this->workOrder->id,
        'project_id' => $this->project->id,
        'status' => TaskStatus::Todo,
    ]);

    $transition = StatusTransition::create([
        'transitionable_type' => Task::class,
        'transitionable_id' => $task->id,
        'user_id' => $this->user->id,
        'from_status' => TaskStatus::Todo->value,
        'to_status' => TaskStatus::InProgress->value,
        'comment' => null,
    ]);

    expect($transition)->toBeInstanceOf(StatusTransition::class);
    expect($transition->from_status)->toBe('todo');
    expect($transition->to_status)->toBe('in_progress');
    expect($transition->user_id)->toBe($this->user->id);
    expect($transition->transitionable_type)->toBe(Task::class);
    expect($transition->transitionable_id)->toBe($task->id);
});

test('StatusTransition polymorphic relationship works with Task and WorkOrder', function () {
    $task = Task::factory()->create([
        'team_id' => $this->team->id,
        'work_order_id' => $this->workOrder->id,
        'project_id' => $this->project->id,
        'status' => TaskStatus::InProgress,
    ]);

    $workOrder = WorkOrder::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
        'created_by_id' => $this->user->id,
        'status' => WorkOrderStatus::Active,
    ]);

    $taskTransition = StatusTransition::create([
        'transitionable_type' => Task::class,
        'transitionable_id' => $task->id,
        'user_id' => $this->user->id,
        'from_status' => TaskStatus::Todo->value,
        'to_status' => TaskStatus::InProgress->value,
        'comment' => 'Started working on task',
    ]);

    $workOrderTransition = StatusTransition::create([
        'transitionable_type' => WorkOrder::class,
        'transitionable_id' => $workOrder->id,
        'user_id' => $this->user->id,
        'from_status' => WorkOrderStatus::Draft->value,
        'to_status' => WorkOrderStatus::Active->value,
        'comment' => 'Activated work order',
    ]);

    expect($taskTransition->transitionable)->toBeInstanceOf(Task::class);
    expect($taskTransition->transitionable->id)->toBe($task->id);

    expect($workOrderTransition->transitionable)->toBeInstanceOf(WorkOrder::class);
    expect($workOrderTransition->transitionable->id)->toBe($workOrder->id);

    expect($task->statusTransitions)->toHaveCount(1);
    expect($task->statusTransitions->first()->to_status)->toBe('in_progress');

    expect($workOrder->statusTransitions)->toHaveCount(1);
    expect($workOrder->statusTransitions->first()->to_status)->toBe('active');
});

<?php

declare(strict_types=1);

use App\Enums\TaskStatus;
use App\Enums\WorkOrderStatus;
use App\Models\Party;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use App\Models\WorkOrder;
use App\Services\WorkflowTransitionService;

beforeEach(function () {
    $this->owner = User::factory()->create();
    $this->team = $this->owner->createTeam(['name' => 'Test Team']);
    $this->owner->current_team_id = $this->team->id;
    $this->owner->save();

    $this->party = Party::factory()->create(['team_id' => $this->team->id]);
    $this->project = Project::factory()->create([
        'team_id' => $this->team->id,
        'party_id' => $this->party->id,
        'owner_id' => $this->owner->id,
    ]);
});

test('work order auto-activates when task transitions to in_progress via workflow service', function () {
    $workOrder = WorkOrder::factory()->draft()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
        'created_by_id' => $this->owner->id,
        'accountable_id' => $this->owner->id,
    ]);

    $task = Task::factory()->todo()->create([
        'team_id' => $this->team->id,
        'work_order_id' => $workOrder->id,
        'project_id' => $this->project->id,
    ]);

    $service = app(WorkflowTransitionService::class);
    $service->transition($task, $this->owner, TaskStatus::InProgress);

    $workOrder->refresh();
    expect($workOrder->status)->toBe(WorkOrderStatus::Active);
});

test('work order does not change status if already active when task starts', function () {
    $workOrder = WorkOrder::factory()->active()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
        'created_by_id' => $this->owner->id,
        'accountable_id' => $this->owner->id,
    ]);

    $task = Task::factory()->todo()->create([
        'team_id' => $this->team->id,
        'work_order_id' => $workOrder->id,
        'project_id' => $this->project->id,
    ]);

    $service = app(WorkflowTransitionService::class);
    $service->transition($task, $this->owner, TaskStatus::InProgress);

    $workOrder->refresh();
    expect($workOrder->status)->toBe(WorkOrderStatus::Active);
});

test('work order auto-activates when task status updated inline to in_progress', function () {
    $workOrder = WorkOrder::factory()->draft()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
        'created_by_id' => $this->owner->id,
        'accountable_id' => $this->owner->id,
    ]);

    $task = Task::factory()->todo()->create([
        'team_id' => $this->team->id,
        'work_order_id' => $workOrder->id,
        'project_id' => $this->project->id,
    ]);

    $this->actingAs($this->owner)
        ->patch("/work/tasks/{$task->id}/status", ['status' => 'in_progress'])
        ->assertRedirect();

    $workOrder->refresh();
    expect($workOrder->status)->toBe(WorkOrderStatus::Active);
});

test('work order stays draft when task is set to todo or done inline', function () {
    $workOrder = WorkOrder::factory()->draft()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
        'created_by_id' => $this->owner->id,
        'accountable_id' => $this->owner->id,
    ]);

    $task = Task::factory()->todo()->create([
        'team_id' => $this->team->id,
        'work_order_id' => $workOrder->id,
        'project_id' => $this->project->id,
    ]);

    $this->actingAs($this->owner)
        ->patch("/work/tasks/{$task->id}/status", ['status' => 'done'])
        ->assertRedirect();

    $workOrder->refresh();
    expect($workOrder->status)->toBe(WorkOrderStatus::Draft);
});

test('auto-activation creates a status transition record for the work order', function () {
    $workOrder = WorkOrder::factory()->draft()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
        'created_by_id' => $this->owner->id,
        'accountable_id' => $this->owner->id,
    ]);

    $task = Task::factory()->todo()->create([
        'team_id' => $this->team->id,
        'work_order_id' => $workOrder->id,
        'project_id' => $this->project->id,
    ]);

    $service = app(WorkflowTransitionService::class);
    $service->transition($task, $this->owner, TaskStatus::InProgress);

    $woTransition = \App\Models\StatusTransition::query()
        ->where('transitionable_type', WorkOrder::class)
        ->where('transitionable_id', $workOrder->id)
        ->where('from_status', 'draft')
        ->where('to_status', 'active')
        ->first();

    expect($woTransition)->not->toBeNull();
    expect($woTransition->comment)->toBe('Auto-activated: task started');
});

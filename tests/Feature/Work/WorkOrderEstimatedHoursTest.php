<?php

use App\Models\Party;
use App\Models\Project;
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
});

function makeWorkOrder(array $attributes = []): WorkOrder
{
    return WorkOrder::factory()->create(array_merge([
        'team_id' => test()->team->id,
        'project_id' => test()->project->id,
        'created_by_id' => test()->user->id,
    ], $attributes));
}

test('effective estimated hours sums task estimates when not set manually', function () {
    $workOrder = makeWorkOrder(['estimated_hours' => null]);

    Task::factory()->create([
        'team_id' => $this->team->id,
        'work_order_id' => $workOrder->id,
        'project_id' => $this->project->id,
        'estimated_hours' => 3,
    ]);
    Task::factory()->create([
        'team_id' => $this->team->id,
        'work_order_id' => $workOrder->id,
        'project_id' => $this->project->id,
        'estimated_hours' => 5,
    ]);

    expect($workOrder->fresh()->effective_estimated_hours)->toBe(8.0);
});

test('effective estimated hours uses the manual value when set', function () {
    $workOrder = makeWorkOrder(['estimated_hours' => 40]);

    Task::factory()->create([
        'team_id' => $this->team->id,
        'work_order_id' => $workOrder->id,
        'project_id' => $this->project->id,
        'estimated_hours' => 5,
    ]);

    expect($workOrder->fresh()->effective_estimated_hours)->toBe(40.0);
});

test('creating a work order without estimated hours leaves it null (auto)', function () {
    $this->actingAs($this->user)->post('/work/work-orders', [
        'title' => 'Auto WO',
        'projectId' => $this->project->id,
        'priority' => 'medium',
        'dueDate' => '2026-01-20',
    ])->assertRedirect();

    $workOrder = WorkOrder::where('title', 'Auto WO')->firstOrFail();
    expect($workOrder->estimated_hours)->toBeNull();
});

test('updating with a value stores a manual estimate', function () {
    $workOrder = makeWorkOrder(['estimated_hours' => null]);

    $this->actingAs($this->user)->patch("/work/work-orders/{$workOrder->id}", [
        'priority' => 'medium',
        'estimated_hours' => 12.5,
    ])->assertRedirect();

    expect((float) $workOrder->fresh()->estimated_hours)->toBe(12.5);
});

test('clearing the estimate reverts the work order to auto', function () {
    $workOrder = makeWorkOrder(['estimated_hours' => 40]);

    $this->actingAs($this->user)->patch("/work/work-orders/{$workOrder->id}", [
        'priority' => 'medium',
        'estimated_hours' => '',
    ])->assertRedirect();

    expect($workOrder->fresh()->estimated_hours)->toBeNull();
});

test('show exposes effective and manual estimated hours props', function () {
    $workOrder = makeWorkOrder(['estimated_hours' => null]);

    Task::factory()->create([
        'team_id' => $this->team->id,
        'work_order_id' => $workOrder->id,
        'project_id' => $this->project->id,
        'estimated_hours' => 7,
    ]);

    $this->actingAs($this->user)
        ->get("/work/work-orders/{$workOrder->id}")
        ->assertInertia(fn ($page) => $page->component('work/work-orders/[id]')
            ->where('workOrder.estimatedHours', 7)
            ->where('workOrder.estimatedHoursManual', null)
            ->where('workOrder.estimatedHoursIsManual', false)
        );
});

test('creating a task persists its estimated hours', function () {
    $workOrder = makeWorkOrder();

    $this->actingAs($this->user)->post('/work/tasks', [
        'title' => 'Estimated task',
        'workOrderId' => $workOrder->id,
        'dueDate' => '2026-01-20',
        'estimatedHours' => 6.5,
    ])->assertRedirect();

    $this->assertDatabaseHas('tasks', [
        'title' => 'Estimated task',
        'work_order_id' => $workOrder->id,
        'estimated_hours' => 6.50,
    ]);
});

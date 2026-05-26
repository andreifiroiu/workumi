<?php

use App\Models\AIAgent;
use App\Models\Party;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use App\Models\WorkOrder;
use App\Models\WorkOrderList;

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

test('user can create a work order', function () {
    $response = $this->actingAs($this->user)->post('/work/work-orders', [
        'title' => 'Test Work Order',
        'projectId' => $this->project->id,
        'description' => 'A test work order',
        'priority' => 'medium',
        'dueDate' => '2026-01-20',
    ]);

    $response->assertRedirect();

    $this->assertDatabaseHas('work_orders', [
        'title' => 'Test Work Order',
        'project_id' => $this->project->id,
        'team_id' => $this->team->id,
        'priority' => 'medium',
        'status' => 'draft',
    ]);
});

test('user can create a work order inside a list', function () {
    $list = WorkOrderList::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
    ]);

    $response = $this->actingAs($this->user)->post('/work/work-orders', [
        'title' => 'Listed Work Order',
        'projectId' => $this->project->id,
        'workOrderListId' => $list->id,
        'priority' => 'medium',
        'dueDate' => '2026-01-20',
    ]);

    $response->assertRedirect();

    $this->assertDatabaseHas('work_orders', [
        'title' => 'Listed Work Order',
        'project_id' => $this->project->id,
        'team_id' => $this->team->id,
        'work_order_list_id' => $list->id,
    ]);
});

test('user can view a work order', function () {
    $workOrder = WorkOrder::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
        'created_by_id' => $this->user->id,
    ]);

    $response = $this->actingAs($this->user)->get("/work/work-orders/{$workOrder->id}");

    $response->assertStatus(200);
    $response->assertInertia(fn ($page) => $page->component('work/work-orders/[id]')
        ->has('workOrder')
        ->where('workOrder.id', (string) $workOrder->id)
    );
});

test('user can update a work order', function () {
    $workOrder = WorkOrder::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
        'created_by_id' => $this->user->id,
    ]);

    $response = $this->actingAs($this->user)->patch("/work/work-orders/{$workOrder->id}", [
        'title' => 'Updated Work Order',
        'priority' => 'high',
    ]);

    $response->assertRedirect();

    $this->assertDatabaseHas('work_orders', [
        'id' => $workOrder->id,
        'title' => 'Updated Work Order',
        'priority' => 'high',
    ]);
});

test('user can update work order status', function () {
    $workOrder = WorkOrder::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
        'created_by_id' => $this->user->id,
        'status' => 'draft',
    ]);

    $response = $this->actingAs($this->user)->patch("/work/work-orders/{$workOrder->id}/status", [
        'status' => 'active',
    ]);

    $response->assertRedirect();

    $this->assertDatabaseHas('work_orders', [
        'id' => $workOrder->id,
        'status' => 'active',
    ]);
});

test('work order status transitions are valid', function () {
    $workOrder = WorkOrder::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
        'created_by_id' => $this->user->id,
        'status' => 'draft',
    ]);

    // Draft -> Active
    $this->actingAs($this->user)->patch("/work/work-orders/{$workOrder->id}/status", ['status' => 'active']);
    expect($workOrder->fresh()->status->value)->toBe('active');

    // Active -> In Review
    $this->actingAs($this->user)->patch("/work/work-orders/{$workOrder->id}/status", ['status' => 'in_review']);
    expect($workOrder->fresh()->status->value)->toBe('in_review');

    // In Review -> Approved
    $this->actingAs($this->user)->patch("/work/work-orders/{$workOrder->id}/status", ['status' => 'approved']);
    expect($workOrder->fresh()->status->value)->toBe('approved');

    // Approved -> Delivered
    $this->actingAs($this->user)->patch("/work/work-orders/{$workOrder->id}/status", ['status' => 'delivered']);
    expect($workOrder->fresh()->status->value)->toBe('delivered');
});

test('user can mark a work order as delivered and archived', function () {
    $workOrder = WorkOrder::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
        'created_by_id' => $this->user->id,
        'status' => 'active',
    ]);

    $response = $this->actingAs($this->user)->post("/work/work-orders/{$workOrder->id}/deliver-and-archive");

    $response->assertRedirect();

    expect($workOrder->fresh()->status->value)->toBe('archived');

    $this->assertDatabaseHas('status_transitions', [
        'transitionable_type' => WorkOrder::class,
        'transitionable_id' => $workOrder->id,
        'from_status' => 'active',
        'to_status' => 'delivered',
    ]);
});

test('deliver and archive skips the delivered transition when already delivered', function () {
    $workOrder = WorkOrder::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
        'created_by_id' => $this->user->id,
        'status' => 'delivered',
    ]);

    $this->actingAs($this->user)->post("/work/work-orders/{$workOrder->id}/deliver-and-archive");

    expect($workOrder->fresh()->status->value)->toBe('archived');

    $this->assertDatabaseMissing('status_transitions', [
        'transitionable_id' => $workOrder->id,
        'to_status' => 'delivered',
    ]);
});

test('deliver and archive completes open tasks', function () {
    $workOrder = WorkOrder::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
        'created_by_id' => $this->user->id,
        'status' => 'active',
    ]);

    $todo = Task::factory()->todo()->create([
        'team_id' => $this->team->id,
        'work_order_id' => $workOrder->id,
        'project_id' => $this->project->id,
        'created_by_id' => $this->user->id,
    ]);
    $inProgress = Task::factory()->inProgress()->create([
        'team_id' => $this->team->id,
        'work_order_id' => $workOrder->id,
        'project_id' => $this->project->id,
        'created_by_id' => $this->user->id,
    ]);

    $this->actingAs($this->user)->post("/work/work-orders/{$workOrder->id}/deliver-and-archive");

    expect($workOrder->fresh()->status->value)->toBe('archived');
    expect($todo->fresh()->status->value)->toBe('done');
    expect($inProgress->fresh()->status->value)->toBe('done');

    $this->assertDatabaseHas('status_transitions', [
        'transitionable_type' => Task::class,
        'transitionable_id' => $todo->id,
        'to_status' => 'done',
    ]);
    $this->assertDatabaseHas('status_transitions', [
        'transitionable_type' => Task::class,
        'transitionable_id' => $inProgress->id,
        'to_status' => 'done',
    ]);
});

test('archive completes open tasks', function () {
    $workOrder = WorkOrder::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
        'created_by_id' => $this->user->id,
        'status' => 'active',
    ]);

    $task = Task::factory()->todo()->create([
        'team_id' => $this->team->id,
        'work_order_id' => $workOrder->id,
        'project_id' => $this->project->id,
        'created_by_id' => $this->user->id,
    ]);

    $this->actingAs($this->user)->post("/work/work-orders/{$workOrder->id}/archive");

    expect($workOrder->fresh()->status->value)->toBe('archived');
    expect($task->fresh()->status->value)->toBe('done');
});

test('deliver and archive aborts when a task cannot be completed', function () {
    $workOrder = WorkOrder::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
        'created_by_id' => $this->user->id,
        'status' => 'active',
    ]);

    $inReview = Task::factory()->inReview()->create([
        'team_id' => $this->team->id,
        'work_order_id' => $workOrder->id,
        'project_id' => $this->project->id,
        'created_by_id' => $this->user->id,
    ]);

    $response = $this->actingAs($this->user)->post("/work/work-orders/{$workOrder->id}/deliver-and-archive");

    $response->assertSessionHasErrors('tasks');

    expect($workOrder->fresh()->status->value)->toBe('active');
    expect($inReview->fresh()->status->value)->toBe('in_review');

    $this->assertDatabaseMissing('status_transitions', [
        'transitionable_type' => Task::class,
        'transitionable_id' => $inReview->id,
        'to_status' => 'done',
    ]);
});

test('completing tasks leaves already-finished tasks untouched', function () {
    $workOrder = WorkOrder::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
        'created_by_id' => $this->user->id,
        'status' => 'active',
    ]);

    $todo = Task::factory()->todo()->create([
        'team_id' => $this->team->id,
        'work_order_id' => $workOrder->id,
        'project_id' => $this->project->id,
        'created_by_id' => $this->user->id,
    ]);
    $cancelled = Task::factory()->cancelled()->create([
        'team_id' => $this->team->id,
        'work_order_id' => $workOrder->id,
        'project_id' => $this->project->id,
        'created_by_id' => $this->user->id,
    ]);
    $done = Task::factory()->done()->create([
        'team_id' => $this->team->id,
        'work_order_id' => $workOrder->id,
        'project_id' => $this->project->id,
        'created_by_id' => $this->user->id,
    ]);

    $this->actingAs($this->user)->post("/work/work-orders/{$workOrder->id}/deliver-and-archive");

    expect($todo->fresh()->status->value)->toBe('done');
    expect($cancelled->fresh()->status->value)->toBe('cancelled');
    expect($done->fresh()->status->value)->toBe('done');

    $this->assertDatabaseMissing('status_transitions', [
        'transitionable_type' => Task::class,
        'transitionable_id' => $cancelled->id,
    ]);
});

test('bulk archive delivered completes tasks across delivered work orders', function () {
    $workOrder = WorkOrder::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
        'created_by_id' => $this->user->id,
        'status' => 'delivered',
    ]);

    $task = Task::factory()->inProgress()->create([
        'team_id' => $this->team->id,
        'work_order_id' => $workOrder->id,
        'project_id' => $this->project->id,
        'created_by_id' => $this->user->id,
    ]);

    $this->actingAs($this->user)->post("/work/projects/{$this->project->id}/work-orders/bulk-archive-delivered");

    expect($workOrder->fresh()->status->value)->toBe('archived');
    expect($task->fresh()->status->value)->toBe('done');
});

test('bulk archive delivered aborts when a delivered work order has an uncompletable task', function () {
    $workOrder = WorkOrder::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
        'created_by_id' => $this->user->id,
        'status' => 'delivered',
    ]);

    $blocked = Task::factory()->blocked()->create([
        'team_id' => $this->team->id,
        'work_order_id' => $workOrder->id,
        'project_id' => $this->project->id,
        'created_by_id' => $this->user->id,
    ]);

    $response = $this->actingAs($this->user)->post("/work/projects/{$this->project->id}/work-orders/bulk-archive-delivered");

    $response->assertSessionHasErrors('tasks');

    expect($workOrder->fresh()->status->value)->toBe('delivered');
    expect($blocked->fresh()->status->value)->toBe('blocked');
});

test('user cannot deliver and archive work orders from another team', function () {
    $otherUser = User::factory()->create();
    $otherTeam = $otherUser->createTeam(['name' => 'Other Team']);
    $otherParty = Party::factory()->create(['team_id' => $otherTeam->id]);
    $otherProject = Project::factory()->create([
        'team_id' => $otherTeam->id,
        'party_id' => $otherParty->id,
        'owner_id' => $otherUser->id,
    ]);
    $workOrder = WorkOrder::factory()->create([
        'team_id' => $otherTeam->id,
        'project_id' => $otherProject->id,
        'created_by_id' => $otherUser->id,
        'status' => 'active',
    ]);

    $response = $this->actingAs($this->user)->post("/work/work-orders/{$workOrder->id}/deliver-and-archive");

    $response->assertForbidden();
    expect($workOrder->fresh()->status->value)->toBe('active');
});

test('user can delete a work order', function () {
    $workOrder = WorkOrder::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
        'created_by_id' => $this->user->id,
    ]);

    $response = $this->actingAs($this->user)->delete("/work/work-orders/{$workOrder->id}");

    $response->assertRedirect();

    $this->assertSoftDeleted('work_orders', [
        'id' => $workOrder->id,
    ]);
});

test('work order show includes agent assignment data for tasks', function () {
    $workOrder = WorkOrder::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
        'created_by_id' => $this->user->id,
    ]);

    $agent = AIAgent::factory()->create();

    $task = Task::factory()->create([
        'team_id' => $this->team->id,
        'work_order_id' => $workOrder->id,
        'project_id' => $this->project->id,
        'assigned_to_id' => null,
        'assigned_agent_id' => $agent->id,
        'created_by_id' => $this->user->id,
    ]);

    $response = $this->actingAs($this->user)->get("/work/work-orders/{$workOrder->id}");

    $response->assertStatus(200);
    $response->assertInertia(fn ($page) => $page
        ->component('work/work-orders/[id]')
        ->has('tasks', 1)
        ->where('tasks.0.assignedAgentId', (string) $agent->id)
        ->where('tasks.0.assignedAgentName', $agent->name)
    );
});

test('work order show exposes parent list and sibling lists for breadcrumbs', function () {
    $list = WorkOrderList::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
        'name' => 'Sprint 1',
    ]);

    $otherList = WorkOrderList::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
        'name' => 'Backlog',
    ]);

    $workOrder = WorkOrder::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
        'created_by_id' => $this->user->id,
        'work_order_list_id' => $list->id,
    ]);

    $response = $this->actingAs($this->user)->get("/work/work-orders/{$workOrder->id}");

    $response->assertStatus(200);
    $response->assertInertia(fn ($page) => $page
        ->component('work/work-orders/[id]')
        ->where('workOrder.workOrderListId', (string) $list->id)
        ->where('workOrder.workOrderListName', 'Sprint 1')
        ->has('siblingLists', 2)
    );
});

test('work order show returns null list fields when ungrouped', function () {
    $workOrder = WorkOrder::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
        'created_by_id' => $this->user->id,
        'work_order_list_id' => null,
    ]);

    $response = $this->actingAs($this->user)->get("/work/work-orders/{$workOrder->id}");

    $response->assertStatus(200);
    $response->assertInertia(fn ($page) => $page
        ->component('work/work-orders/[id]')
        ->where('workOrder.workOrderListId', null)
        ->where('workOrder.workOrderListName', null)
    );
});

test('user cannot access work orders from another team', function () {
    $otherUser = User::factory()->create();
    $otherTeam = $otherUser->createTeam(['name' => 'Other Team']);
    $otherParty = Party::factory()->create(['team_id' => $otherTeam->id]);
    $otherProject = Project::factory()->create([
        'team_id' => $otherTeam->id,
        'party_id' => $otherParty->id,
        'owner_id' => $otherUser->id,
    ]);
    $otherWorkOrder = WorkOrder::factory()->create([
        'team_id' => $otherTeam->id,
        'project_id' => $otherProject->id,
        'created_by_id' => $otherUser->id,
    ]);

    $response = $this->actingAs($this->user)->get("/work/work-orders/{$otherWorkOrder->id}");

    $response->assertStatus(403);
});

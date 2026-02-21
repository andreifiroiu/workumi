<?php

use App\Models\AIAgent;
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

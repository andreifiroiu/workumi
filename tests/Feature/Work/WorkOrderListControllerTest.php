<?php

use App\Models\Party;
use App\Models\Project;
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

test('user can create a work order list', function () {
    $response = $this->actingAs($this->user)->post('/work/work-order-lists', [
        'projectId' => $this->project->id,
        'name' => 'Sprint 1',
        'description' => 'First sprint tasks',
        'color' => '#3b82f6',
    ]);

    $response->assertRedirect();

    $this->assertDatabaseHas('work_order_lists', [
        'project_id' => $this->project->id,
        'team_id' => $this->team->id,
        'name' => 'Sprint 1',
        'description' => 'First sprint tasks',
        'color' => '#3b82f6',
    ]);
});

test('user can create a work order list without optional fields', function () {
    $response = $this->actingAs($this->user)->post('/work/work-order-lists', [
        'projectId' => $this->project->id,
        'name' => 'Backlog',
    ]);

    $response->assertRedirect();

    $this->assertDatabaseHas('work_order_lists', [
        'project_id' => $this->project->id,
        'name' => 'Backlog',
        'description' => null,
        'color' => null,
    ]);
});

test('user can update a work order list', function () {
    $list = WorkOrderList::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
        'name' => 'Original Name',
    ]);

    $response = $this->actingAs($this->user)->patch("/work/work-order-lists/{$list->id}", [
        'name' => 'Updated Name',
        'color' => '#ef4444',
    ]);

    $response->assertRedirect();

    $this->assertDatabaseHas('work_order_lists', [
        'id' => $list->id,
        'name' => 'Updated Name',
        'color' => '#ef4444',
    ]);
});

test('user can delete a work order list', function () {
    $list = WorkOrderList::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
    ]);

    $response = $this->actingAs($this->user)->delete("/work/work-order-lists/{$list->id}");

    $response->assertRedirect();

    $this->assertSoftDeleted('work_order_lists', [
        'id' => $list->id,
    ]);
});

test('deleting a list moves work orders to ungrouped', function () {
    $list = WorkOrderList::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
    ]);

    $workOrder = WorkOrder::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
        'created_by_id' => $this->user->id,
        'work_order_list_id' => $list->id,
        'position_in_list' => 100,
    ]);

    $this->actingAs($this->user)->delete("/work/work-order-lists/{$list->id}");

    $this->assertDatabaseHas('work_orders', [
        'id' => $workOrder->id,
        'work_order_list_id' => null,
        'position_in_list' => 0,
    ]);
});

test('user can move a work order to a list', function () {
    $list = WorkOrderList::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
    ]);

    $workOrder = WorkOrder::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
        'created_by_id' => $this->user->id,
        'work_order_list_id' => null,
    ]);

    $response = $this->actingAs($this->user)->post("/work/work-order-lists/{$list->id}/move-work-order", [
        'workOrderId' => $workOrder->id,
    ]);

    $response->assertRedirect();

    $this->assertDatabaseHas('work_orders', [
        'id' => $workOrder->id,
        'work_order_list_id' => $list->id,
    ]);
});

test('user can remove a work order from a list', function () {
    $list = WorkOrderList::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
    ]);

    $workOrder = WorkOrder::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
        'created_by_id' => $this->user->id,
        'work_order_list_id' => $list->id,
        'position_in_list' => 100,
    ]);

    $response = $this->actingAs($this->user)->post("/work/work-orders/{$workOrder->id}/remove-from-list");

    $response->assertRedirect();

    $this->assertDatabaseHas('work_orders', [
        'id' => $workOrder->id,
        'work_order_list_id' => null,
        'position_in_list' => 0,
    ]);
});

test('user can reorder lists in a project', function () {
    $list1 = WorkOrderList::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
        'position' => 100,
    ]);

    $list2 = WorkOrderList::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
        'position' => 200,
    ]);

    $response = $this->actingAs($this->user)->post("/work/projects/{$this->project->id}/lists/reorder", [
        'listIds' => [$list2->id, $list1->id],
    ]);

    $response->assertRedirect();

    expect($list2->fresh()->position)->toBeLessThan($list1->fresh()->position);
});

test('user can reorder work orders within a list', function () {
    $list = WorkOrderList::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
    ]);

    $wo1 = WorkOrder::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
        'created_by_id' => $this->user->id,
        'work_order_list_id' => $list->id,
        'position_in_list' => 100,
    ]);

    $wo2 = WorkOrder::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
        'created_by_id' => $this->user->id,
        'work_order_list_id' => $list->id,
        'position_in_list' => 200,
    ]);

    $response = $this->actingAs($this->user)->post("/work/projects/{$this->project->id}/work-orders/reorder", [
        'listId' => $list->id,
        'workOrderIds' => [$wo2->id, $wo1->id],
    ]);

    $response->assertRedirect();

    expect($wo2->fresh()->position_in_list)->toBeLessThan($wo1->fresh()->position_in_list);
});

test('user cannot access lists from another team', function () {
    $otherUser = User::factory()->create();
    $otherTeam = $otherUser->createTeam(['name' => 'Other Team']);
    $otherParty = Party::factory()->create(['team_id' => $otherTeam->id]);
    $otherProject = Project::factory()->create([
        'team_id' => $otherTeam->id,
        'party_id' => $otherParty->id,
        'owner_id' => $otherUser->id,
    ]);
    $otherList = WorkOrderList::factory()->create([
        'team_id' => $otherTeam->id,
        'project_id' => $otherProject->id,
    ]);

    $response = $this->actingAs($this->user)->patch("/work/work-order-lists/{$otherList->id}", [
        'name' => 'Hacked',
    ]);

    $response->assertStatus(403);
});

test('user cannot move work order to list in different project', function () {
    $list = WorkOrderList::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
    ]);

    $otherProject = Project::factory()->create([
        'team_id' => $this->team->id,
        'party_id' => $this->party->id,
        'owner_id' => $this->user->id,
    ]);

    $workOrder = WorkOrder::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $otherProject->id,
        'created_by_id' => $this->user->id,
    ]);

    $response = $this->actingAs($this->user)->post("/work/work-order-lists/{$list->id}/move-work-order", [
        'workOrderId' => $workOrder->id,
    ]);

    $response->assertStatus(403);
});

test('new lists are positioned at the end', function () {
    $existingList = WorkOrderList::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
        'position' => 100,
    ]);

    $this->actingAs($this->user)->post('/work/work-order-lists', [
        'projectId' => $this->project->id,
        'name' => 'New List',
    ]);

    $newList = WorkOrderList::where('name', 'New List')->first();

    expect($newList->position)->toBeGreaterThan($existingList->position);
});

test('user can create work order with list assignment', function () {
    $list = WorkOrderList::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
    ]);

    $response = $this->actingAs($this->user)->post('/work/work-orders', [
        'title' => 'Test Work Order',
        'projectId' => $this->project->id,
        'priority' => 'medium',
        'dueDate' => '2026-01-20',
        'workOrderListId' => $list->id,
    ]);

    $response->assertRedirect();

    $this->assertDatabaseHas('work_orders', [
        'title' => 'Test Work Order',
        'work_order_list_id' => $list->id,
    ]);
});

test('user can convert a work order list into a new project', function () {
    $otherParty = Party::factory()->create(['team_id' => $this->team->id]);
    $list = WorkOrderList::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
        'description' => 'Phase two scope',
    ]);
    $workOrders = WorkOrder::factory()->count(2)->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
        'work_order_list_id' => $list->id,
        'accountable_id' => $this->user->id,
    ]);

    $response = $this->actingAs($this->user)->post(
        "/work/work-order-lists/{$list->id}/convert-to-project",
        [
            'name' => 'Phase Two',
            'partyId' => $otherParty->id,
            'startDate' => '2026-06-01',
            'targetEndDate' => '2026-07-01',
        ]
    );

    $newProject = Project::where('name', 'Phase Two')->first();

    expect($newProject)->not->toBeNull();
    $response->assertRedirect("/work/projects/{$newProject->id}");

    $this->assertDatabaseHas('projects', [
        'id' => $newProject->id,
        'team_id' => $this->team->id,
        'party_id' => $otherParty->id,
        'owner_id' => $this->user->id,
        'accountable_id' => $this->user->id,
        'description' => 'Phase two scope',
    ]);

    foreach ($workOrders as $workOrder) {
        $this->assertDatabaseHas('work_orders', [
            'id' => $workOrder->id,
            'project_id' => $newProject->id,
            'work_order_list_id' => null,
        ]);
    }

    $this->assertSoftDeleted('work_order_lists', ['id' => $list->id]);
});

test('converting a list requires name, party and start date', function () {
    $list = WorkOrderList::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
    ]);

    $response = $this->actingAs($this->user)->post(
        "/work/work-order-lists/{$list->id}/convert-to-project",
        []
    );

    $response->assertSessionHasErrors(['name', 'partyId', 'startDate']);
});

test('user cannot convert a list from another team', function () {
    $otherUser = User::factory()->create();
    $otherTeam = $otherUser->createTeam(['name' => 'Other Team']);
    $otherUser->current_team_id = $otherTeam->id;
    $otherUser->save();
    $otherParty = Party::factory()->create(['team_id' => $otherTeam->id]);

    $list = WorkOrderList::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
    ]);

    $response = $this->actingAs($otherUser)->post(
        "/work/work-order-lists/{$list->id}/convert-to-project",
        [
            'name' => 'Hijacked',
            'partyId' => $otherParty->id,
            'startDate' => '2026-06-01',
        ]
    );

    $response->assertForbidden();
    $this->assertDatabaseHas('work_order_lists', ['id' => $list->id, 'deleted_at' => null]);
    $this->assertDatabaseMissing('projects', ['name' => 'Hijacked']);
});

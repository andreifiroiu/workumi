<?php

declare(strict_types=1);

use App\Enums\ProjectStatus;
use App\Enums\TaskStatus;
use App\Enums\WorkOrderStatus;
use App\Models\Deliverable;
use App\Models\Document;
use App\Models\Folder;
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

    // Both projects are pinned active: the factory picks a random status, and an
    // archived destination is a case this file tests deliberately below.
    $this->party = Party::factory()->create(['team_id' => $this->team->id]);
    $this->project = Project::factory()->active()->create([
        'team_id' => $this->team->id,
        'party_id' => $this->party->id,
        'owner_id' => $this->user->id,
    ]);

    // The destination sits under a different client, so a stale party contact
    // on the moved work order is visible rather than coincidentally correct.
    $this->destinationParty = Party::factory()->create(['team_id' => $this->team->id]);
    $this->destination = Project::factory()->active()->create([
        'team_id' => $this->team->id,
        'party_id' => $this->destinationParty->id,
        'owner_id' => $this->user->id,
    ]);

    $this->workOrder = WorkOrder::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
        'created_by_id' => $this->user->id,
        'party_contact_id' => $this->party->id,
    ]);

    // A complete second team, for every "belongs to someone else" case below.
    $this->outsider = User::factory()->create();
    $this->otherTeam = $this->outsider->createTeam(['name' => 'Other Team']);
    $this->otherParty = Party::factory()->create(['team_id' => $this->otherTeam->id]);
    $this->otherProject = Project::factory()->create([
        'team_id' => $this->otherTeam->id,
        'party_id' => $this->otherParty->id,
        'owner_id' => $this->outsider->id,
    ]);

    $this->move = fn (array $payload = []) => $this->actingAs($this->user)->post(
        "/work/work-orders/{$this->workOrder->id}/move",
        $payload + ['projectId' => $this->destination->id],
    );
});

test('a work order moves to another project', function () {
    $response = ($this->move)();

    $response->assertRedirect();

    $this->assertDatabaseHas('work_orders', [
        'id' => $this->workOrder->id,
        'project_id' => $this->destination->id,
        'work_order_list_id' => null,
        // Derived from the parent project, so it follows rather than labelling
        // the work order with the previous client.
        'party_contact_id' => $this->destinationParty->id,
    ]);
});

test('tasks and deliverables follow the work order into the new project', function () {
    $task = Task::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
        'work_order_id' => $this->workOrder->id,
    ]);
    $deliverable = Deliverable::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
        'work_order_id' => $this->workOrder->id,
    ]);

    ($this->move)();

    $this->assertDatabaseHas('tasks', ['id' => $task->id, 'project_id' => $this->destination->id]);
    $this->assertDatabaseHas('deliverables', ['id' => $deliverable->id, 'project_id' => $this->destination->id]);
});

test('a soft deleted task follows the work order too', function () {
    // Left behind, it would be restored into a project its work order has left.
    $task = Task::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
        'work_order_id' => $this->workOrder->id,
    ]);
    $task->delete();

    ($this->move)();

    expect(Task::withTrashed()->find($task->id)->project_id)->toBe($this->destination->id);
});

test('a soft deleted deliverable follows the work order too', function () {
    $deliverable = Deliverable::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
        'work_order_id' => $this->workOrder->id,
    ]);
    $deliverable->delete();

    ($this->move)();

    expect(Deliverable::withTrashed()->find($deliverable->id)->project_id)
        ->toBe($this->destination->id);
});

test('a work order already in a list can be refiled into another list', function () {
    // The no-op guard compares list ids, so the non-null to non-null case needs
    // exercising as much as the ungrouped one.
    $from = WorkOrderList::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
    ]);
    $to = WorkOrderList::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
    ]);
    $this->workOrder->update(['work_order_list_id' => $from->id, 'position_in_list' => 500]);

    $this->actingAs($this->user)
        ->post("/work/work-orders/{$this->workOrder->id}/move", [
            'projectId' => $this->project->id,
            'workOrderListId' => $to->id,
        ])
        ->assertSessionHasNoErrors();

    expect($this->workOrder->refresh()->work_order_list_id)->toBe($to->id)
        ->and($this->workOrder->position_in_list)->toBe(100);
});

test('moving into a list files the work order at the end of that list', function () {
    $list = WorkOrderList::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->destination->id,
    ]);
    WorkOrder::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->destination->id,
        'work_order_list_id' => $list->id,
        'position_in_list' => 100,
        'created_by_id' => $this->user->id,
    ]);

    ($this->move)(['workOrderListId' => $list->id]);

    $this->assertDatabaseHas('work_orders', [
        'id' => $this->workOrder->id,
        'work_order_list_id' => $list->id,
        'position_in_list' => 200,
    ]);
});

test('moving without a list leaves the work order ungrouped at the end', function () {
    WorkOrder::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->destination->id,
        'work_order_list_id' => null,
        'position_in_list' => 100,
        'created_by_id' => $this->user->id,
    ]);

    ($this->move)();

    $this->assertDatabaseHas('work_orders', [
        'id' => $this->workOrder->id,
        'work_order_list_id' => null,
        'position_in_list' => 200,
    ]);
});

test('moving unfiles documents from folders in the old project', function () {
    // Folders are project-scoped, so a file left in one would vanish from the
    // work order while still showing under the project it no longer belongs to.
    $sourceFolder = Folder::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
        'created_by_id' => $this->user->id,
    ]);
    $teamFolder = Folder::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => null,
        'created_by_id' => $this->user->id,
    ]);
    $destinationFolder = Folder::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->destination->id,
        'created_by_id' => $this->user->id,
    ]);

    $documents = collect([$sourceFolder, $teamFolder, $destinationFolder])->map(
        fn (Folder $folder) => Document::factory()->create([
            'team_id' => $this->team->id,
            'uploaded_by_id' => $this->user->id,
            'documentable_type' => WorkOrder::class,
            'documentable_id' => $this->workOrder->id,
            'folder_id' => $folder->id,
        ])
    );

    ($this->move)();

    expect($documents[0]->refresh()->folder_id)->toBeNull()
        // A team-level folder stays valid across projects.
        ->and($documents[1]->refresh()->folder_id)->toBe($teamFolder->id)
        ->and($documents[2]->refresh()->folder_id)->toBe($destinationFolder->id);
});

test('moving recalculates progress and hours on both projects', function () {
    Task::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
        'work_order_id' => $this->workOrder->id,
        'status' => TaskStatus::Done,
        'actual_hours' => 6,
    ]);

    // A second work order keeps the source project non-empty, so its progress
    // has somewhere to land other than the empty-project zero.
    $staying = WorkOrder::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
        'created_by_id' => $this->user->id,
        'status' => WorkOrderStatus::Active,
    ]);
    Task::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
        'work_order_id' => $staying->id,
        'status' => TaskStatus::Todo,
        'actual_hours' => 4,
    ]);

    $this->project->recalculateProgress();
    $this->project->recalculateActualHours();
    expect($this->project->refresh()->progress)->toBe(50)
        ->and((float) $this->project->actual_hours)->toBe(10.0);

    ($this->move)();

    expect($this->project->refresh()->progress)->toBe(0)
        ->and((float) $this->project->actual_hours)->toBe(4.0)
        ->and($this->destination->refresh()->progress)->toBe(100)
        ->and((float) $this->destination->actual_hours)->toBe(6.0);
});

test('an archived work order can still be moved', function () {
    // Misfiled work is worth correcting even after it is put away.
    $this->workOrder->update(['status' => WorkOrderStatus::Archived]);

    ($this->move)();

    $this->assertDatabaseHas('work_orders', [
        'id' => $this->workOrder->id,
        'project_id' => $this->destination->id,
    ]);
});

test('a viewer cannot move a work order', function () {
    $viewer = addTeamMember($this->team, roleCode: 'viewer');

    $this->actingAs($viewer)
        ->post("/work/work-orders/{$this->workOrder->id}/move", ['projectId' => $this->destination->id])
        ->assertForbidden();

    expect($this->workOrder->refresh()->project_id)->toBe($this->project->id);
});

test('a user from another team cannot move a work order', function () {
    $this->actingAs($this->outsider)
        ->post("/work/work-orders/{$this->workOrder->id}/move", ['projectId' => $this->destination->id])
        ->assertForbidden();

    expect($this->workOrder->refresh()->project_id)->toBe($this->project->id);
});

test('a work order in a private project the user cannot see cannot be moved', function () {
    $this->project->update(['is_private' => true]);
    $stranger = addTeamMember($this->team);

    $this->actingAs($stranger)
        ->post("/work/work-orders/{$this->workOrder->id}/move", ['projectId' => $this->destination->id])
        ->assertForbidden();

    expect($this->workOrder->refresh()->project_id)->toBe($this->project->id);
});

test('a work order cannot be moved to a project in another team', function () {
    ($this->move)(['projectId' => $this->otherProject->id])
        ->assertSessionHasErrors('projectId');

    expect($this->workOrder->refresh()->project_id)->toBe($this->project->id);
});

test('a work order cannot be moved into a private project the user cannot see', function () {
    $this->destination->update(['is_private' => true]);
    $member = addTeamMember($this->team);
    $this->workOrder->update(['accountable_id' => $member->id]);

    $this->actingAs($member)
        ->post("/work/work-orders/{$this->workOrder->id}/move", ['projectId' => $this->destination->id])
        ->assertSessionHasErrors('projectId');

    expect($this->workOrder->refresh()->project_id)->toBe($this->project->id);
});

test('a work order cannot be moved into an archived project', function () {
    // Live work would land somewhere the tree never renders it.
    $this->destination->update(['status' => ProjectStatus::Archived]);

    ($this->move)()->assertSessionHasErrors('projectId');

    expect($this->workOrder->refresh()->project_id)->toBe($this->project->id);
});

test('moving requires a destination project', function () {
    $this->actingAs($this->user)
        ->post("/work/work-orders/{$this->workOrder->id}/move", [])
        ->assertSessionHasErrors('projectId');
});

test('moving rejects a list that belongs to a different project', function () {
    $sourceList = WorkOrderList::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
    ]);

    ($this->move)(['workOrderListId' => $sourceList->id])
        ->assertSessionHasErrors('workOrderListId');

    expect($this->workOrder->refresh()->project_id)->toBe($this->project->id);
});

test('moving accepts a list from the destination project', function () {
    $list = WorkOrderList::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->destination->id,
    ]);

    ($this->move)(['workOrderListId' => $list->id])->assertSessionHasNoErrors();

    expect($this->workOrder->refresh()->work_order_list_id)->toBe($list->id);
});

test('moving to the work order current project and list changes nothing', function () {
    // The action hangs off three separate menus, so a no-op must not send the
    // work order to the end of the list it already sits in.
    $this->workOrder->update(['position_in_list' => 100]);

    $this->actingAs($this->user)
        ->post("/work/work-orders/{$this->workOrder->id}/move", ['projectId' => $this->project->id])
        ->assertSessionHasNoErrors();

    expect($this->workOrder->refresh()->position_in_list)->toBe(100)
        ->and($this->workOrder->project_id)->toBe($this->project->id);
});

test('moving within the same project to a different list refiles the work order', function () {
    $list = WorkOrderList::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
    ]);

    $this->actingAs($this->user)
        ->post("/work/work-orders/{$this->workOrder->id}/move", [
            'projectId' => $this->project->id,
            'workOrderListId' => $list->id,
        ])
        ->assertSessionHasNoErrors();

    expect($this->workOrder->refresh()->work_order_list_id)->toBe($list->id)
        ->and($this->workOrder->position_in_list)->toBe(100)
        ->and($this->workOrder->project_id)->toBe($this->project->id);
});

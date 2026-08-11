<?php

declare(strict_types=1);

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

    $this->workOrder = WorkOrder::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
        'created_by_id' => $this->user->id,
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
});

test('creating a work order assigns it to a team member', function () {
    $member = addTeamMember($this->team);

    $this->actingAs($this->user)->post('/work/work-orders', [
        'title' => 'Assigned Work Order',
        'projectId' => $this->project->id,
        'priority' => 'medium',
        'assignedToId' => $member->id,
    ])->assertRedirect();

    $this->assertDatabaseHas('work_orders', [
        'title' => 'Assigned Work Order',
        'assigned_to_id' => $member->id,
    ]);
});

test('creating a work order can assign it to the team owner', function () {
    // Owners are never written to `team_user`, so a pivot-only membership check
    // rejects the one person guaranteed to be on every team.
    $this->actingAs($this->user)->post('/work/work-orders', [
        'title' => 'Owner Work Order',
        'projectId' => $this->project->id,
        'priority' => 'medium',
        'assignedToId' => $this->user->id,
    ])->assertRedirect();

    $this->assertDatabaseHas('work_orders', [
        'title' => 'Owner Work Order',
        'assigned_to_id' => $this->user->id,
    ]);
});

test('creating a work order rejects an assignee from another team', function () {
    $this->actingAs($this->user)->post('/work/work-orders', [
        'title' => 'Cross Team Assignee',
        'projectId' => $this->project->id,
        'priority' => 'medium',
        'assignedToId' => $this->outsider->id,
    ])->assertSessionHasErrors('assignedToId');

    $this->assertDatabaseMissing('work_orders', ['title' => 'Cross Team Assignee']);
});

test('creating a work order rejects a project from another team', function () {
    // The row would be written with the actor's team_id but another team's
    // project_id — a cross-team orphan that also copies the foreign party.
    $this->actingAs($this->user)->post('/work/work-orders', [
        'title' => 'Foreign Project',
        'projectId' => $this->otherProject->id,
        'priority' => 'medium',
    ])->assertSessionHasErrors('projectId');

    $this->assertDatabaseMissing('work_orders', ['title' => 'Foreign Project']);
});

test('creating a work order rejects a private project the user cannot see', function () {
    $member = addTeamMember($this->team);

    $privateProject = Project::factory()->private()->create([
        'team_id' => $this->team->id,
        'party_id' => $this->party->id,
        'owner_id' => $this->user->id,
        'accountable_id' => $this->user->id,
    ]);

    $this->actingAs($member)->post('/work/work-orders', [
        'title' => 'Private Project Work Order',
        'projectId' => $privateProject->id,
        'priority' => 'medium',
    ])->assertSessionHasErrors('projectId');

    $this->assertDatabaseMissing('work_orders', ['title' => 'Private Project Work Order']);
});

test('creating a work order accepts a list from its own project', function () {
    // Guards the scoping rules against over-correcting into rejecting everything.
    $list = WorkOrderList::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
    ]);

    $this->actingAs($this->user)->post('/work/work-orders', [
        'title' => 'Listed Work Order',
        'projectId' => $this->project->id,
        'priority' => 'medium',
        'workOrderListId' => $list->id,
    ])->assertRedirect();

    $this->assertDatabaseHas('work_orders', [
        'title' => 'Listed Work Order',
        'work_order_list_id' => $list->id,
    ]);
});

test('creating a work order rejects a list from a different project on the same team', function () {
    // Sharper than the cross-team case: a team check alone would let this pass.
    $siblingProject = Project::factory()->create([
        'team_id' => $this->team->id,
        'party_id' => $this->party->id,
        'owner_id' => $this->user->id,
    ]);
    $siblingList = WorkOrderList::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $siblingProject->id,
    ]);

    $this->actingAs($this->user)->post('/work/work-orders', [
        'title' => 'Sibling List',
        'projectId' => $this->project->id,
        'priority' => 'medium',
        'workOrderListId' => $siblingList->id,
    ])->assertSessionHasErrors('workOrderListId');

    $this->assertDatabaseMissing('work_orders', ['title' => 'Sibling List']);
});

test('an invalid project does not also blame the list it was checked against', function () {
    $list = WorkOrderList::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
    ]);

    $this->actingAs($this->user)->post('/work/work-orders', [
        'title' => 'No Project',
        'priority' => 'medium',
        'workOrderListId' => $list->id,
    ])
        ->assertSessionHasErrors('projectId')
        ->assertSessionDoesntHaveErrors('workOrderListId');
});

test('a viewer cannot create or update a work order', function () {
    $viewer = addTeamMember($this->team, roleCode: 'viewer');

    $this->actingAs($viewer)->post('/work/work-orders', [
        'title' => 'Viewer Work Order',
        'projectId' => $this->project->id,
        'priority' => 'medium',
    ])->assertForbidden();

    $this->actingAs($viewer)
        ->patch("/work/work-orders/{$this->workOrder->id}", ['title' => 'Renamed by viewer'])
        ->assertForbidden();

    $this->assertDatabaseMissing('work_orders', ['title' => 'Viewer Work Order']);
    expect($this->workOrder->fresh()->title)->not->toBe('Renamed by viewer');
});

test('updating a work order still applies a valid assignee', function () {
    $member = addTeamMember($this->team);

    $this->actingAs($this->user)
        ->patch("/work/work-orders/{$this->workOrder->id}", [
            'title' => 'Renamed',
            'assignedToId' => $member->id,
        ])
        ->assertRedirect();

    $fresh = $this->workOrder->fresh();

    expect($fresh->assigned_to_id)->toBe($member->id)
        ->and($fresh->title)->toBe('Renamed');
});

test('creating a work order rejects a list belonging to another project', function () {
    $foreignList = WorkOrderList::factory()->create([
        'team_id' => $this->otherTeam->id,
        'project_id' => $this->otherProject->id,
    ]);

    $this->actingAs($this->user)->post('/work/work-orders', [
        'title' => 'Foreign List',
        'projectId' => $this->project->id,
        'priority' => 'medium',
        'workOrderListId' => $foreignList->id,
    ])->assertSessionHasErrors('workOrderListId');

    $this->assertDatabaseMissing('work_orders', ['title' => 'Foreign List']);
});

test('updating a work order rejects an assignee from another team', function () {
    $this->actingAs($this->user)
        ->patch("/work/work-orders/{$this->workOrder->id}", [
            'assignedToId' => $this->outsider->id,
        ])
        ->assertSessionHasErrors('assignedToId');

    expect($this->workOrder->fresh()->assigned_to_id)->not->toBe($this->outsider->id);
});

test('accepting a routing recommendation rejects a user from another team', function () {
    // responsible_id is a RACI field, and WorkOrder::hasUserInAnyRole turns it
    // into an access grant — this would hand an outsider the work order.
    $this->actingAs($this->user)
        ->post("/work/work-orders/{$this->workOrder->id}/accept-routing", [
            'userId' => $this->outsider->id,
        ])
        ->assertSessionHasErrors('userId');

    expect($this->workOrder->fresh()->responsible_id)->not->toBe($this->outsider->id);
});

test('accepting a routing recommendation assigns a team member', function () {
    $member = addTeamMember($this->team);

    $this->actingAs($this->user)
        ->post("/work/work-orders/{$this->workOrder->id}/accept-routing", [
            'userId' => $member->id,
        ])
        ->assertRedirect();

    expect($this->workOrder->fresh()->responsible_id)->toBe($member->id);
});

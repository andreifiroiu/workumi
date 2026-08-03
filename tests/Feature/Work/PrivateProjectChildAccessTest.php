<?php

use App\Models\Party;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use App\Models\WorkOrder;

beforeEach(function () {
    $this->owner = User::factory()->create();
    $this->team = $this->owner->createTeam(['name' => 'Test Team']);
    $this->owner->current_team_id = $this->team->id;
    $this->owner->save();

    $this->party = Party::factory()->create(['team_id' => $this->team->id]);

    $this->project = Project::factory()->private()->create([
        'team_id' => $this->team->id,
        'party_id' => $this->party->id,
        'owner_id' => $this->owner->id,
        'accountable_id' => $this->owner->id,
    ]);

    $this->workOrder = WorkOrder::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
        'created_by_id' => $this->owner->id,
        'accountable_id' => $this->owner->id,
    ]);

    $this->task = Task::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
        'work_order_id' => $this->workOrder->id,
    ]);

    // On the team, but with no access to the private project.
    $this->outsider = addTeamMember($this->team);
});

test('work orders inside a private project are hidden from team members without access', function () {
    $this->actingAs($this->outsider)
        ->get(route('work-orders.show', $this->workOrder))
        ->assertForbidden();
});

test('tasks inside a private project are hidden from team members without access', function () {
    $this->actingAs($this->outsider)
        ->get(route('tasks.show', $this->task))
        ->assertForbidden();
});

test('an explicit project member can open the work orders and tasks inside it', function () {
    $this->project->members()->attach($this->outsider, ['added_by_id' => $this->owner->id]);

    $this->actingAs($this->outsider)
        ->get(route('work-orders.show', $this->workOrder))
        ->assertOk();

    $this->actingAs($this->outsider)
        ->get(route('tasks.show', $this->task))
        ->assertOk();
});

test('children of a public project stay visible to the whole team', function () {
    $this->project->update(['is_private' => false]);

    $this->actingAs($this->outsider)
        ->get(route('work-orders.show', $this->workOrder))
        ->assertOk();

    $this->actingAs($this->outsider)
        ->get(route('tasks.show', $this->task))
        ->assertOk();
});

test('a team member without access cannot modify work orders in a private project', function () {
    $this->actingAs($this->outsider)
        ->patch(route('work-orders.update', $this->workOrder), ['title' => 'Hijacked'])
        ->assertForbidden();

    expect($this->workOrder->fresh()->title)->not->toBe('Hijacked');
});

test('a team member without access cannot modify tasks in a private project', function () {
    $this->actingAs($this->outsider)
        ->patch(route('tasks.update', $this->task), ['title' => 'Hijacked'])
        ->assertForbidden();

    expect($this->task->fresh()->title)->not->toBe('Hijacked');
});

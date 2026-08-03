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
});

test('a work order assignee with no access is still offered in the member picker', function () {
    $assignee = addTeamMember($this->team);

    WorkOrder::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
        'created_by_id' => $this->owner->id,
        'accountable_id' => $this->owner->id,
        'assigned_to_id' => $assignee->id,
    ]);

    // Being assigned work does not grant access to a private project...
    expect($this->project->isVisibleTo($assignee->id))->toBeFalse();

    $props = $this->actingAs($this->owner)
        ->get(route('projects.show', $this->project))
        ->viewData('page')['props'];

    // ...but they do appear in the team card, so the picker must not filter on that list.
    expect(collect($props['teamMembers'])->pluck('id')->all())
        ->toContain((string) $assignee->id);

    $assignable = collect($props['assignableUsers'])->firstWhere('id', (string) $assignee->id);

    expect($assignable)->not->toBeNull()
        ->and($assignable['hasAccess'])->toBeFalse();
});

test('people who already reach the project are marked as having access', function () {
    $member = addTeamMember($this->team);
    $this->project->members()->attach($member, ['added_by_id' => $this->owner->id]);

    $consulted = addTeamMember($this->team);
    $this->project->update(['consulted_ids' => [$consulted->id]]);

    $assignable = collect(
        $this->actingAs($this->owner)
            ->get(route('projects.show', $this->project))
            ->viewData('page')['props']['assignableUsers']
    )->keyBy('id');

    expect($assignable[(string) $member->id]['hasAccess'])->toBeTrue()
        ->and($assignable[(string) $consulted->id]['hasAccess'])->toBeTrue()
        ->and($assignable[(string) $this->owner->id]['hasAccess'])->toBeTrue();
});

test('user ids sent as strings are accepted', function () {
    $target = addTeamMember($this->team);

    $this->actingAs($this->owner)
        ->post(route('projects.members.store', $this->project), [
            'user_ids' => [(string) $target->id],
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    expect($this->project->fresh()->members->pluck('id')->all())->toContain($target->id);
});

test('a soft-deleted project still shields its work orders and tasks', function () {
    $workOrder = WorkOrder::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
        'created_by_id' => $this->owner->id,
        'accountable_id' => $this->owner->id,
    ]);

    $task = Task::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
        'work_order_id' => $workOrder->id,
    ]);

    $outsider = addTeamMember($this->team);

    $this->project->delete();

    expect($outsider->can('view', $workOrder->fresh()))->toBeFalse()
        ->and($outsider->can('update', $workOrder->fresh()))->toBeFalse()
        ->and($outsider->can('view', $task->fresh()))->toBeFalse()
        ->and($outsider->can('update', $task->fresh()))->toBeFalse();
});

test('a membership created concurrently does not blow up the request', function () {
    $target = addTeamMember($this->team);

    // Stand in for the race: the row appears after the controller computed its diff.
    $this->project->members()->attach($target, ['added_by_id' => $this->owner->id]);
    $this->project->unsetRelation('members');

    $this->actingAs($this->owner)
        ->post(route('projects.members.store', $this->project), [
            'user_ids' => [$target->id],
        ])
        ->assertRedirect();

    expect($this->project->fresh()->members)->toHaveCount(1);
});

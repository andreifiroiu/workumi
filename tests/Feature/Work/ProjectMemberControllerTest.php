<?php

use App\Models\AuditLog;
use App\Models\Party;
use App\Models\Project;
use App\Models\User;

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

test('someone with access can add a member and the grant records who issued it', function () {
    $newMember = addTeamMember($this->team);

    $response = $this->actingAs($this->owner)
        ->post(route('projects.members.store', $this->project), [
            'user_ids' => [$newMember->id],
        ]);

    $response->assertRedirect();

    $this->assertDatabaseHas('project_members', [
        'project_id' => $this->project->id,
        'user_id' => $newMember->id,
        'added_by_id' => $this->owner->id,
    ]);
});

test('several members can be added in one request', function () {
    $first = addTeamMember($this->team);
    $second = addTeamMember($this->team);

    $this->actingAs($this->owner)
        ->post(route('projects.members.store', $this->project), [
            'user_ids' => [$first->id, $second->id],
        ])
        ->assertRedirect();

    expect($this->project->fresh()->members)->toHaveCount(2);
});

test('re-adding an existing member does not overwrite who granted the access', function () {
    $member = addTeamMember($this->team);

    // Needs access of their own to be allowed to add anyone.
    $otherManager = addTeamMember($this->team);
    $this->project->members()->attach($otherManager, ['added_by_id' => $this->owner->id]);

    $this->actingAs($this->owner)
        ->post(route('projects.members.store', $this->project), ['user_ids' => [$member->id]]);

    $this->actingAs($otherManager)
        ->post(route('projects.members.store', $this->project), ['user_ids' => [$member->id]])
        ->assertRedirect();

    $this->assertDatabaseHas('project_members', [
        'project_id' => $this->project->id,
        'user_id' => $member->id,
        'added_by_id' => $this->owner->id,
    ]);
    expect($this->project->fresh()->members->pluck('id')->all())->toContain($member->id);
});

test('the team owner can be added even though they are not in the team_user pivot', function () {
    $manager = addTeamMember($this->team);
    $project = Project::factory()->private()->create([
        'team_id' => $this->team->id,
        'party_id' => $this->party->id,
        'owner_id' => $manager->id,
        'accountable_id' => $manager->id,
    ]);

    $this->actingAs($manager)
        ->post(route('projects.members.store', $project), ['user_ids' => [$this->owner->id]])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $this->assertDatabaseHas('project_members', [
        'project_id' => $project->id,
        'user_id' => $this->owner->id,
    ]);
});

test('a user from outside the team is rejected by validation', function () {
    $stranger = User::factory()->create();

    $this->actingAs($this->owner)
        ->post(route('projects.members.store', $this->project), ['user_ids' => [$stranger->id]])
        ->assertSessionHasErrors('user_ids.0');

    expect($this->project->fresh()->members)->toBeEmpty();
});

test('a team member without access to the private project cannot add members', function () {
    $outsider = addTeamMember($this->team);
    $target = addTeamMember($this->team);

    $this->actingAs($outsider)
        ->post(route('projects.members.store', $this->project), ['user_ids' => [$target->id]])
        ->assertForbidden();
});

test('an added member can themselves add further members', function () {
    $member = addTeamMember($this->team);
    $this->project->members()->attach($member, ['added_by_id' => $this->owner->id]);

    $another = addTeamMember($this->team);

    $this->actingAs($member)
        ->post(route('projects.members.store', $this->project), ['user_ids' => [$another->id]])
        ->assertRedirect();

    expect($this->project->fresh()->members->pluck('id')->all())->toContain($another->id);
});

test('an explicit member can be removed', function () {
    $member = addTeamMember($this->team);
    $this->project->members()->attach($member, ['added_by_id' => $this->owner->id]);

    $this->actingAs($this->owner)
        ->delete(route('projects.members.destroy', [$this->project, $member]))
        ->assertRedirect();

    $this->assertDatabaseMissing('project_members', [
        'project_id' => $this->project->id,
        'user_id' => $member->id,
    ]);
});

test('a raci-only user cannot be removed through the members endpoint', function () {
    $consulted = addTeamMember($this->team);
    $this->project->update(['consulted_ids' => [$consulted->id]]);

    $this->actingAs($this->owner)
        ->delete(route('projects.members.destroy', [$this->project, $consulted]))
        ->assertNotFound();

    expect($this->project->fresh()->consulted_ids)->toContain($consulted->id);
});

test('the project owner cannot be removed through the members endpoint', function () {
    $this->actingAs($this->owner)
        ->delete(route('projects.members.destroy', [$this->project, $this->owner]))
        ->assertNotFound();
});

test('leaving a private project redirects to work and revokes access', function () {
    $member = addTeamMember($this->team);
    $this->project->members()->attach($member, ['added_by_id' => $this->owner->id]);

    $this->actingAs($member)
        ->delete(route('projects.members.destroy', [$this->project, $member]))
        ->assertRedirect(route('work'));

    $this->actingAs($member)
        ->get(route('projects.show', $this->project))
        ->assertForbidden();
});

test('leaving a public project keeps access and returns to the project', function () {
    $this->project->update(['is_private' => false]);

    $member = addTeamMember($this->team);
    $this->project->members()->attach($member, ['added_by_id' => $this->owner->id]);

    $this->actingAs($member)
        ->from(route('projects.show', $this->project))
        ->delete(route('projects.members.destroy', [$this->project, $member]))
        ->assertRedirect(route('projects.show', $this->project));

    $this->actingAs($member)
        ->get(route('projects.show', $this->project))
        ->assertOk();
});

test('both member changes are written to the audit log', function () {
    $member = addTeamMember($this->team);

    $this->actingAs($this->owner)
        ->post(route('projects.members.store', $this->project), ['user_ids' => [$member->id]]);

    $this->actingAs($this->owner)
        ->delete(route('projects.members.destroy', [$this->project, $member]));

    expect(AuditLog::where('action', 'project_members_added')->exists())->toBeTrue()
        ->and(AuditLog::where('action', 'project_member_removed')->exists())->toBeTrue();
});

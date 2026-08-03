<?php

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

test('scopeVisibleTo includes a private project for a member with no raci role', function () {
    $member = addTeamMember($this->team);
    $this->project->members()->attach($member, ['added_by_id' => $this->owner->id]);

    $visible = Project::forTeam($this->team->id)->visibleTo($member->id)->pluck('id');

    expect($visible)->toContain($this->project->id);
});

test('scopeVisibleTo still excludes a private project from a non-member', function () {
    $outsider = addTeamMember($this->team);

    $visible = Project::forTeam($this->team->id)->visibleTo($outsider->id)->pluck('id');

    expect($visible)->not->toContain($this->project->id);
});

test('the membership clause does not break json raci matching', function () {
    $consulted = addTeamMember($this->team);
    $informed = addTeamMember($this->team);

    $this->project->update([
        'consulted_ids' => [$consulted->id],
        'informed_ids' => [$informed->id],
    ]);

    expect(Project::forTeam($this->team->id)->visibleTo($consulted->id)->pluck('id'))
        ->toContain($this->project->id)
        ->and(Project::forTeam($this->team->id)->visibleTo($informed->id)->pluck('id'))
        ->toContain($this->project->id);
});

test('visibility composed with forTeam does not leak across teams', function () {
    $otherOwner = User::factory()->create();
    $otherTeam = $otherOwner->createTeam(['name' => 'Other Team']);
    $otherParty = Party::factory()->create(['team_id' => $otherTeam->id]);

    $foreignProject = Project::factory()->create([
        'team_id' => $otherTeam->id,
        'party_id' => $otherParty->id,
        'owner_id' => $otherOwner->id,
        'accountable_id' => $otherOwner->id,
        'is_private' => false,
    ]);

    $member = addTeamMember($this->team);
    $this->project->members()->attach($member, ['added_by_id' => $this->owner->id]);

    $visible = Project::forTeam($this->team->id)->visibleTo($member->id)->pluck('id');

    expect($visible)->toContain($this->project->id)
        ->and($visible)->not->toContain($foreignProject->id);
});

test('isVisibleTo agrees whether or not members are eager loaded', function () {
    $member = addTeamMember($this->team);
    $this->project->members()->attach($member, ['added_by_id' => $this->owner->id]);

    $lazy = Project::find($this->project->id);
    $eager = Project::with('members')->find($this->project->id);

    expect($lazy->isVisibleTo($member->id))->toBeTrue()
        ->and($eager->isVisibleTo($member->id))->toBeTrue()
        ->and($eager->relationLoaded('members'))->toBeTrue();
});

test('a member can open the project and sees it in the work index', function () {
    $member = addTeamMember($this->team);
    $this->project->members()->attach($member, ['added_by_id' => $this->owner->id]);

    $this->actingAs($member)->get(route('projects.show', $this->project))->assertOk();

    $this->actingAs($member)->get('/work')->assertOk()->assertInertia(
        fn ($page) => $page->where('projects.0.id', (string) $this->project->id)
    );
});

test('the team payload marks explicit members as removable and raci roles as not', function () {
    $member = addTeamMember($this->team);
    $this->project->members()->attach($member, ['added_by_id' => $this->owner->id]);

    $consulted = addTeamMember($this->team);
    $this->project->update(['consulted_ids' => [$consulted->id]]);

    $response = $this->actingAs($this->owner)->get(route('projects.show', $this->project));

    $teamMembers = collect($response->viewData('page')['props']['teamMembers']);

    $memberRow = $teamMembers->firstWhere('id', (string) $member->id);
    $consultedRow = $teamMembers->firstWhere('id', (string) $consulted->id);

    expect($memberRow['canRemove'])->toBeTrue()
        ->and($memberRow['isExplicitMember'])->toBeTrue()
        ->and(collect($memberRow['roles'])->pluck('role')->all())->toBe(['member'])
        ->and($memberRow['workload'])->toBe([
            'workOrdersCount' => 0,
            'tasksCount' => 0,
            'totalEstimatedHours' => 0,
        ])
        ->and($consultedRow['canRemove'])->toBeFalse();
});

test('the project page offers only team members who are not already on it', function () {
    $member = addTeamMember($this->team);
    $this->project->members()->attach($member, ['added_by_id' => $this->owner->id]);

    $available = addTeamMember($this->team);

    $response = $this->actingAs($this->owner)->get(route('projects.show', $this->project));
    $props = $response->viewData('page')['props'];

    expect(collect($props['assignableUsers'])->pluck('id')->all())
        ->toContain((string) $available->id)
        ->and($props['canManageMembers'])->toBeTrue();
});

<?php

declare(strict_types=1);

use App\Models\Playbook;
use App\Models\User;

beforeEach(function () {
    $this->owner = createTeamOwner();
    $this->team = $this->owner->currentTeam;

    $this->admin = createTeamUser($this->team, 'admin');
    $this->member = createTeamUser($this->team, 'member');
    $this->viewer = createTeamUser($this->team, 'viewer');

    // Authored by the member, so deletion by anyone else exercises the
    // administrator branch that used to call a non-existent isAdmin().
    $this->playbook = Playbook::factory()->create([
        'team_id' => $this->team->id,
        'created_by' => $this->member->id,
    ]);
});

test('a non-creator admin can delete a playbook without erroring', function () {
    expect($this->admin->can('delete', $this->playbook))->toBeTrue();

    $this->actingAs($this->admin)
        ->delete(route('playbooks.destroy', $this->playbook))
        ->assertRedirect();

    $this->assertSoftDeleted('playbooks', ['id' => $this->playbook->id]);
});

test('the team owner can delete a playbook they did not create', function () {
    expect($this->owner->can('delete', $this->playbook))->toBeTrue();
});

test('the creator can delete their own playbook', function () {
    expect($this->member->can('delete', $this->playbook))->toBeTrue();
});

test('a non-creator member cannot delete a playbook', function () {
    $otherMember = createTeamUser($this->team, 'member');

    expect($otherMember->can('delete', $this->playbook))->toBeFalse();
});

test('a viewer can read but not write playbooks', function () {
    expect($this->viewer->can('view', $this->playbook))->toBeTrue()
        ->and($this->viewer->can('update', $this->playbook))->toBeFalse()
        ->and($this->viewer->can('delete', $this->playbook))->toBeFalse()
        ->and($this->viewer->can('create', Playbook::class))->toBeFalse();
});

test('a user with no current team is refused rather than erroring', function () {
    $teamless = User::factory()->create();

    expect($teamless->can('view', $this->playbook))->toBeFalse()
        ->and($teamless->can('update', $this->playbook))->toBeFalse()
        ->and($teamless->can('delete', $this->playbook))->toBeFalse()
        ->and($teamless->can('viewAny', Playbook::class))->toBeFalse();
});

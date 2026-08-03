<?php

declare(strict_types=1);

use App\Models\User;

beforeEach(function () {
    $this->owner = createTeamOwner();
    $this->team = $this->owner->currentTeam;
});

test('the owner passes every tier despite having no team_user row', function () {
    $this->assertDatabaseMissing('team_user', [
        'team_id' => $this->team->id,
        'user_id' => $this->owner->id,
    ]);

    expect($this->owner->canAdministerTeam($this->team))->toBeTrue()
        ->and($this->owner->canWriteTeamContent($this->team))->toBeTrue();
});

test('role codes map to the expected tiers', function (string $roleCode, bool $canAdminister, bool $canWrite) {
    $user = createTeamUser($this->team, $roleCode);

    expect($user->canAdministerTeam($this->team))->toBe($canAdminister)
        ->and($user->canWriteTeamContent($this->team))->toBe($canWrite);
})->with([
    'admin' => ['admin', true, true],
    'member' => ['member', false, true],
    'viewer' => ['viewer', false, false],
]);

test('a user with no role row fails closed on both tiers', function () {
    $ghost = User::factory()->create();
    $ghost->forceFill(['current_team_id' => $this->team->id])->save();

    expect($ghost->refresh()->canAdministerTeam($this->team))->toBeFalse()
        ->and($ghost->canWriteTeamContent($this->team))->toBeFalse();
});

test('a user from another team fails closed on both tiers', function () {
    $outsider = createTeamOwner();

    expect($outsider->canAdministerTeam($this->team))->toBeFalse()
        ->and($outsider->canWriteTeamContent($this->team))->toBeFalse();
});

test('passing no team falls back to the current team', function () {
    $member = createTeamUser($this->team, 'member');

    expect($member->canWriteTeamContent())->toBeTrue()
        ->and($member->canAdministerTeam())->toBeFalse()
        ->and($this->owner->canAdministerTeam())->toBeTrue();
});

test('a teamless user is refused rather than erroring', function () {
    $teamless = User::factory()->create();

    expect($teamless->canAdministerTeam())->toBeFalse()
        ->and($teamless->canWriteTeamContent())->toBeFalse();
});

test('repeated role checks are memoized', function () {
    $member = createTeamUser($this->team, 'member');

    DB::enableQueryLog();
    $member->canWriteTeamContent($this->team);
    $firstCallQueries = count(DB::getQueryLog());

    DB::flushQueryLog();
    $member->canWriteTeamContent($this->team);
    $secondCallQueries = count(DB::getQueryLog());
    DB::disableQueryLog();

    expect($firstCallQueries)->toBeGreaterThan(0)
        ->and($secondCallQueries)->toBe(0);
});

<?php

use App\Models\Team;
use App\Models\User;
use App\Observers\TeamObserver;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/*
|--------------------------------------------------------------------------
| Test Case
|--------------------------------------------------------------------------
|
| The closure you provide to your test functions is always bound to a specific PHPUnit test
| case class. By default, that class is "PHPUnit\Framework\TestCase". Of course, you may
| need to change it using the "pest()" function to bind a different classes or traits.
|
*/

pest()->extend(TestCase::class)
    ->use(RefreshDatabase::class)
    ->in('Feature');

/*
|--------------------------------------------------------------------------
| Expectations
|--------------------------------------------------------------------------
|
| When you're writing tests, you often need to check that values meet certain conditions. The
| "expect()" function gives you access to a set of "expectations" methods that you can use
| to assert different things. Of course, you may extend the Expectation API at any time.
|
*/

expect()->extend('toBeOne', function () {
    return $this->toBe(1);
});

/*
|--------------------------------------------------------------------------
| Functions
|--------------------------------------------------------------------------
|
| While Pest is very powerful out-of-the-box, you may have some testing code specific to your
| project that you don't want to repeat in every file. Here you can also expose helpers as
| global functions to help you to reduce the number of lines of code in your test files.
|
*/

/**
 * Create a user owning a fresh team, with their current team set.
 */
function createTeamOwner(array $attributes = []): User
{
    $user = User::factory()->create($attributes);
    $team = $user->createTeam(['name' => 'Test Team']);

    $user->forceFill(['current_team_id' => $team->id])->save();

    return $user->refresh();
}

/**
 * Create a user holding the given role on the team.
 *
 * Sets both the team_user pivot row and current_team_id: policies compare the
 * current team, while the role checks read the pivot, so a user missing either
 * one fails authorization in ways that do not occur in production.
 */
function createTeamUser(Team $team, string $roleCode = 'member', array $attributes = []): User
{
    $user = User::factory()->create($attributes);

    if (! $team->hasRole($roleCode)) {
        (new TeamObserver)->createDefaultRoles($team);
        $team->refresh();
    }

    $team->users()->attach($user, ['role_id' => $team->getRole($roleCode)->id]);
    $user->forceFill(['current_team_id' => $team->id])->save();

    return $user->refresh();
}

/**
 * Create (or attach) a genuine member of the given team, with that team set as their current one.
 *
 * Users made with User::factory() alone are on no team at all, which most team-scoped endpoints
 * now reject.
 */
function addTeamMember(Team $team, ?User $user = null, string $roleCode = 'member'): User
{
    $user ??= User::factory()->create();

    $team->users()->attach($user, ['role_id' => $team->getRole($roleCode)->id]);
    $user->forceFill(['current_team_id' => $team->id])->save();

    return $user->refresh();
}

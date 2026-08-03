<?php

declare(strict_types=1);

use App\Http\Middleware\ResolveTeamAccess;
use App\Models\User;
use App\Support\TeamAccess;
use Illuminate\Support\Facades\Route;

function registerTeamAccessRoute(string $uri): void
{
    Route::middleware(['auth:sanctum', ResolveTeamAccess::class])
        ->get($uri, function () {
            $access = app(TeamAccess::class);

            return response()->json([
                'team_ids' => $access->teamIds,
                'default_team_id' => $access->defaultTeamId,
            ]);
        });
}

test('access covers every team the user owns or belongs to', function () {
    $user = User::factory()->create();
    $owned = $user->createTeam(['name' => 'Owned Team']);

    $colleague = User::factory()->create();
    $joined = $colleague->createTeam(['name' => 'Joined Team']);
    $joined->addUser($user, 'member');

    $user->forceFill(['current_team_id' => $owned->id])->save();

    registerTeamAccessRoute('/_test_team_access');

    $response = $this->withToken($user->createToken('test')->plainTextToken)
        ->getJson('/_test_team_access');

    $response->assertOk();
    expect($response->json('team_ids'))->toEqualCanonicalizing([$owned->id, $joined->id])
        ->and($response->json('default_team_id'))->toBe($owned->id);
});

test('a token restricted to specific teams only reaches those teams', function () {
    $user = User::factory()->create();
    $first = $user->createTeam(['name' => 'First Team']);
    $second = $user->createTeam(['name' => 'Second Team']);
    $user->forceFill(['current_team_id' => $first->id])->save();

    $newToken = $user->createToken('restricted');
    $newToken->accessToken->forceFill(['team_ids' => [$second->id]])->save();

    registerTeamAccessRoute('/_test_restricted_access');

    $response = $this->withToken($newToken->plainTextToken)
        ->getJson('/_test_restricted_access');

    $response->assertOk();
    expect($response->json('team_ids'))->toBe([$second->id])
        // current_team_id points outside the restriction, so it cannot be the default.
        ->and($response->json('default_team_id'))->toBe($second->id);
});

test('a restriction naming a team the user left is dropped', function () {
    $user = User::factory()->create();
    $team = $user->createTeam(['name' => 'Still A Member']);

    $stranger = User::factory()->create();
    $otherTeam = $stranger->createTeam(['name' => 'Never Joined']);

    $newToken = $user->createToken('stale');
    $newToken->accessToken->forceFill(['team_ids' => [$team->id, $otherTeam->id]])->save();

    registerTeamAccessRoute('/_test_stale_restriction');

    $response = $this->withToken($newToken->plainTextToken)
        ->getJson('/_test_stale_restriction');

    $response->assertOk();
    expect($response->json('team_ids'))->toBe([$team->id]);
});

test('a restriction with no reachable team is rejected', function () {
    $user = User::factory()->create();
    $user->createTeam(['name' => 'Own Team']);

    $stranger = User::factory()->create();
    $otherTeam = $stranger->createTeam(['name' => 'Someone Else']);

    $newToken = $user->createToken('impossible');
    $newToken->accessToken->forceFill(['team_ids' => [$otherTeam->id]])->save();

    registerTeamAccessRoute('/_test_empty_restriction');

    $this->withToken($newToken->plainTextToken)
        ->getJson('/_test_empty_restriction')
        ->assertForbidden();
});

test('middleware returns 403 when the user belongs to no team', function () {
    $user = User::factory()->create(['current_team_id' => null]);

    registerTeamAccessRoute('/_test_no_team');

    $this->withToken($user->createToken('test')->plainTextToken)
        ->getJson('/_test_no_team')
        ->assertForbidden();
});

test('unauthenticated request returns 401 before middleware runs', function () {
    registerTeamAccessRoute('/_test_unauth');

    $this->getJson('/_test_unauth')->assertUnauthorized();
});

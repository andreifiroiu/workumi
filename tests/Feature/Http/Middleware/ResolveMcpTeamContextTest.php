<?php

use App\Http\Middleware\ResolveMcpTeamContext;
use App\Mcp\TeamContext;
use App\Models\User;
use Illuminate\Support\Facades\Route;

test('middleware resolves TeamContext for user with current team', function () {
    $user = User::factory()->create();
    $team = $user->createTeam(['name' => 'Test Team']);
    $user->forceFill(['current_team_id' => $team->id])->save();

    Route::middleware(['auth:sanctum', ResolveMcpTeamContext::class])
        ->get('/_test_team_context', function () {
            $ctx = app(TeamContext::class);

            return response()->json(['team_id' => $ctx->teamId]);
        });

    $token = $user->createToken('test')->plainTextToken;

    $response = $this->withToken($token)->get('/_test_team_context');

    $response->assertOk();
    $response->assertJson(['team_id' => $team->id]);
});

test('middleware returns 403 when user has no current team', function () {
    $user = User::factory()->create(['current_team_id' => null]);

    Route::middleware(['auth:sanctum', ResolveMcpTeamContext::class])
        ->get('/_test_no_team', fn () => response('ok'));

    $token = $user->createToken('test')->plainTextToken;

    $response = $this->withToken($token)->get('/_test_no_team');

    $response->assertForbidden();
});

test('unauthenticated request returns 401 before middleware runs', function () {
    Route::middleware(['auth:sanctum', ResolveMcpTeamContext::class])
        ->get('/_test_unauth', fn () => response('ok'));

    $response = $this->withHeader('Accept', 'application/json')->get('/_test_unauth');

    $response->assertUnauthorized();
});

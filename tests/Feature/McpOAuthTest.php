<?php

declare(strict_types=1);

use App\Models\OAuthUser;
use App\Models\User;
use Illuminate\Support\Facades\Artisan;
use Laravel\Passport\AccessToken;
use Laravel\Passport\Client;
use Laravel\Passport\Passport;
use Laravel\Passport\PersonalAccessTokenFactory;

beforeEach(function () {
    // The resource server needs signing keys to mint/validate real tokens; CI
    // checkouts won't have the gitignored storage keys, so generate on demand.
    if (! file_exists(storage_path('oauth-private.key'))) {
        Artisan::call('passport:keys', ['--no-interaction' => true]);
    }

    $this->owner = User::factory()->create();
    $this->team = $this->owner->createTeam(['name' => 'Test Team']);
    $this->owner->current_team_id = $this->team->id;
    $this->owner->save();
});

/**
 * Mint a genuine, signed OAuth access token for the owner via the personal
 * access grant. Unlike Passport::actingAs(), this exercises the real resource
 * server, token guard, and oauth_users provider resolution.
 *
 * @param  string[]  $scopes
 */
function mintMcpToken(int $userId, array $scopes): string
{
    Client::factory()->asPersonalAccessTokenClient()->create(['provider' => 'oauth_users']);

    return app(PersonalAccessTokenFactory::class)
        ->make($userId, 'mcp-test', $scopes, 'oauth_users')
        ->accessToken;
}

test('oauth protected resource discovery advertises the mcp scope', function () {
    $this->getJson('/.well-known/oauth-protected-resource')
        ->assertOk()
        ->assertJson(['scopes_supported' => ['mcp:use']]);
});

test('oauth authorization server discovery advertises passport endpoints', function () {
    $response = $this->getJson('/.well-known/oauth-authorization-server')
        ->assertOk()
        ->assertJson([
            'authorization_endpoint' => route('passport.authorizations.authorize'),
            'token_endpoint' => route('passport.token'),
            'code_challenge_methods_supported' => ['S256'],
            'grant_types_supported' => ['authorization_code', 'refresh_token'],
        ]);

    expect($response->json('registration_endpoint'))->toEndWith('/oauth/register');
});

test('mcp endpoint rejects unauthenticated requests', function () {
    $this->postJson('/mcp', [
        'jsonrpc' => '2.0',
        'id' => 1,
        'method' => 'tools/list',
    ])->assertUnauthorized();
});

test('mcp endpoint accepts a passport authenticated user', function () {
    Passport::actingAs(OAuthUser::findOrFail($this->owner->id), ['mcp:use']);

    $this->postJson('/mcp', [
        'jsonrpc' => '2.0',
        'id' => 1,
        'method' => 'tools/list',
    ])->assertOk();
});

test('oauth authenticated users have write access despite only the mcp:use scope', function () {
    $user = OAuthUser::findOrFail($this->owner->id);
    $user->withAccessToken(new AccessToken(['oauth_scopes' => ['mcp:use']]));

    expect($user->tokenCan('*'))->toBeTrue()
        ->and($user->tokenCan('write'))->toBeTrue();
});

test('a real signed oauth token with mcp:use authenticates through the token guard', function () {
    $token = mintMcpToken($this->owner->id, ['mcp:use']);

    $this->withToken($token)
        ->postJson('/mcp', [
            'jsonrpc' => '2.0',
            'id' => 1,
            'method' => 'tools/list',
        ])
        ->assertOk()
        ->assertJsonPath('jsonrpc', '2.0')
        ->assertJsonPath('id', 1)
        ->assertJsonMissingPath('error');
});

test('an oauth token without the mcp:use scope is rejected by the scope gate', function () {
    Passport::actingAs(OAuthUser::findOrFail($this->owner->id), []);

    $this->postJson('/mcp', [
        'jsonrpc' => '2.0',
        'id' => 1,
        'method' => 'tools/list',
    ])->assertForbidden();
});

test('a sanctum personal access token still authenticates without scope gating', function () {
    $token = $this->owner->createToken('cli', ['*'])->plainTextToken;

    $this->withToken($token)
        ->postJson('/mcp', [
            'jsonrpc' => '2.0',
            'id' => 1,
            'method' => 'tools/list',
        ])
        ->assertOk()
        ->assertJsonMissingPath('error');
});

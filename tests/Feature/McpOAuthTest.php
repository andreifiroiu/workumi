<?php

declare(strict_types=1);

use App\Models\OAuthUser;
use App\Models\User;
use Laravel\Passport\AccessToken;
use Laravel\Passport\Passport;

beforeEach(function () {
    $this->owner = User::factory()->create();
    $this->team = $this->owner->createTeam(['name' => 'Test Team']);
    $this->owner->current_team_id = $this->team->id;
    $this->owner->save();
});

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

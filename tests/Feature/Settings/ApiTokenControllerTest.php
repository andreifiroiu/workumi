<?php

use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('authenticated user can view api tokens page', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->get('/account/api-tokens');

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page->component('account/api-tokens'));
});

test('unauthenticated user is redirected to login', function () {
    $response = $this->get('/account/api-tokens');

    $response->assertRedirect(route('login'));
});

test('user can generate a token with a valid name', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post('/account/api-tokens', [
        'name' => 'My Claude Token',
    ]);

    $response->assertRedirect();
    $response->assertSessionHas('newToken');
    expect($user->tokens()->count())->toBe(1);
    expect($user->tokens()->first()->name)->toBe('My Claude Token');
});

test('token name is required', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post('/account/api-tokens', [
        'name' => '',
    ]);

    $response->assertSessionHasErrors('name');
});

test('user can generate a read-only token', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->post('/account/api-tokens', [
        'name' => 'Read Only Token',
        'access' => 'read',
    ]);

    $token = $user->tokens()->first();
    expect($token->abilities)->toBe(['read']);
});

test('user can generate a full-access token', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->post('/account/api-tokens', [
        'name' => 'Full Access Token',
        'access' => 'full',
    ]);

    $token = $user->tokens()->first();
    expect($token->abilities)->toBe(['*']);
});

test('token defaults to full access when access field is omitted', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->post('/account/api-tokens', [
        'name' => 'Default Token',
    ]);

    $token = $user->tokens()->first();
    expect($token->abilities)->toBe(['*']);
});

test('user can revoke their own token', function () {
    $user = User::factory()->create();
    $token = $user->createToken('Test Token')->accessToken;

    $response = $this->actingAs($user)->delete('/account/api-tokens/'.$token->id);

    $response->assertRedirect();
    expect($user->tokens()->count())->toBe(0);
});

test('user cannot revoke another users token', function () {
    $owner = User::factory()->create();
    $token = $owner->createToken('Owner Token')->accessToken;

    $attacker = User::factory()->create();

    $response = $this->actingAs($attacker)->delete('/account/api-tokens/'.$token->id);

    $response->assertForbidden();
    expect($owner->tokens()->count())->toBe(1);
});

test('api tokens page shows existing tokens', function () {
    $user = User::factory()->create();
    $user->createToken('Token A');
    $user->createToken('Token B');

    $response = $this->actingAs($user)->get('/account/api-tokens');

    $response->assertInertia(fn (Assert $page) => $page
        ->component('account/api-tokens')
        ->has('tokens', 2)
    );
});

test('new token is passed to page after generation', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->post('/account/api-tokens', ['name' => 'Test']);

    $response = $this->actingAs($user)->get('/account/api-tokens');

    $response->assertInertia(fn (Assert $page) => $page
        ->component('account/api-tokens')
        ->whereNot('newToken', null)
    );
});

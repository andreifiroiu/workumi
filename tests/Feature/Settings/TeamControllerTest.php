<?php

use App\Models\Team;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('authenticated user can view the teams page with the correct component', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->get('/account/teams');

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page->component('account/teams/index'));
});

test('unauthenticated user is redirected to login', function () {
    $response = $this->get('/account/teams');

    $response->assertRedirect(route('login'));
});

test('user can create a team and is redirected to the teams page', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post('/account/teams', [
        'name' => 'Acme Co',
    ]);

    $response->assertRedirect(route('account.teams.index'));

    $this->assertDatabaseHas('teams', [
        'name' => 'Acme Co',
        'user_id' => $user->id,
    ]);

    $team = Team::where('name', 'Acme Co')->first();
    expect($user->fresh()->current_team_id)->toBe($team->id);
});

test('creating a team requires a name', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post('/account/teams', [
        'name' => '',
    ]);

    $response->assertSessionHasErrors('name');
});

test('the redirect target after creating a team renders the teams component', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)
        ->followingRedirects()
        ->post('/account/teams', ['name' => 'Beta Team']);

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page->component('account/teams/index'));
});

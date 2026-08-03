<?php

use App\Models\User;

test('an inertia logout tells the client to do a full page visit', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)
        ->withHeaders(['X-Inertia' => 'true', 'X-Inertia-Version' => ''])
        ->post('/logout');

    // The marketing site at "/" is not an Inertia response. Without the 409 + X-Inertia-Location
    // pair the client renders that HTML in an error modal over the app instead of navigating.
    $response->assertStatus(409);
    $response->assertHeader('X-Inertia-Location', '/');

    $this->assertGuest();
});

test('a plain logout still redirects to the public site', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post('/logout');

    $response->assertRedirect('/');
    $this->assertGuest();
});

test('an api client logging out gets no content', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)
        ->postJson('/logout');

    $response->assertNoContent();
    $this->assertGuest();
});

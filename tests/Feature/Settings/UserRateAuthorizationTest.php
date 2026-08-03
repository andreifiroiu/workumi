<?php

declare(strict_types=1);

beforeEach(function () {
    $this->owner = createTeamOwner();
    $this->team = $this->owner->currentTeam;

    $this->member = createTeamUser($this->team, 'member');

    $this->outsider = createTeamOwner();
});

test('a rate cannot be written for a user outside the acting team', function () {
    $this->actingAs($this->owner)
        ->post(route('settings.rates.store'), [
            'user_id' => $this->outsider->id,
            'internal_rate' => 50.00,
            'billing_rate' => 100.00,
            'effective_date' => now()->toDateString(),
        ])
        ->assertSessionHasErrors(['user_id']);

    $this->assertDatabaseMissing('user_rates', ['user_id' => $this->outsider->id]);
});

test('the owner can set their own rate even though they have no pivot row', function () {
    $this->actingAs($this->owner)
        ->post(route('settings.rates.store'), [
            'user_id' => $this->owner->id,
            'internal_rate' => 60.00,
            'billing_rate' => 120.00,
            'effective_date' => now()->toDateString(),
        ])
        ->assertSessionHasNoErrors();

    $this->assertDatabaseHas('user_rates', [
        'team_id' => $this->team->id,
        'user_id' => $this->owner->id,
    ]);
});

test('the owner can set a team members rate', function () {
    $this->actingAs($this->owner)
        ->post(route('settings.rates.store'), [
            'user_id' => $this->member->id,
            'internal_rate' => 40.00,
            'billing_rate' => 80.00,
            'effective_date' => now()->toDateString(),
        ])
        ->assertSessionHasNoErrors();

    $this->assertDatabaseHas('user_rates', ['user_id' => $this->member->id]);
});

test('a member cannot read or write rates', function () {
    $this->actingAs($this->member)
        ->get(route('settings.rates.index'))
        ->assertForbidden();

    $this->actingAs($this->member)
        ->post(route('settings.rates.store'), [
            'user_id' => $this->member->id,
            'internal_rate' => 999.00,
            'billing_rate' => 999.00,
            'effective_date' => now()->toDateString(),
        ])
        ->assertForbidden();

    $this->assertDatabaseMissing('user_rates', ['internal_rate' => 999.00]);
});

test('an admin can manage rates', function () {
    $admin = createTeamUser($this->team, 'admin');

    $this->actingAs($admin)
        ->get(route('settings.rates.index'))
        ->assertOk();
});

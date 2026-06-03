<?php

use App\Models\NotificationPreference;
use App\Models\User;

function userWithTeam(array $attributes = []): User
{
    $user = User::factory()->create($attributes);
    $team = $user->createTeam(['name' => 'Notify Team']);
    $user->forceFill(['current_team_id' => $team->id])->save();

    return $user;
}

/**
 * Build a full, valid update payload (digest hour + every editable matrix field).
 *
 * @param  array<string, mixed>  $overrides
 * @return array<string, mixed>
 */
function notificationPayload(array $overrides = []): array
{
    $payload = ['daily_digest_hour' => 8];

    foreach (NotificationPreference::editableFields() as $field) {
        $payload[$field] = true;
    }

    return array_merge($payload, $overrides);
}

test('notification settings page is displayed', function () {
    $user = userWithTeam();

    $this
        ->actingAs($user)
        ->get(route('account.notifications.edit'))
        ->assertOk();
});

test('digest hour and matrix preferences can be updated', function () {
    $user = userWithTeam(['daily_digest_hour' => 8]);

    $this
        ->actingAs($user)
        ->patch(route('account.notifications.update'), notificationPayload([
            'daily_digest_hour' => 17,
            'email_daily_digest' => false,
        ]))
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('account.notifications.edit'));

    $user->refresh();
    $prefs = NotificationPreference::forUser($user->currentTeam, $user);

    expect($user->daily_digest_hour)->toBe(17);
    expect($prefs->email_daily_digest)->toBeFalse();
    expect($prefs->email_project_updates)->toBeTrue();
});

test('digest hour must be within the valid range', function () {
    $user = userWithTeam();

    $this
        ->actingAs($user)
        ->patch(route('account.notifications.update'), notificationPayload([
            'daily_digest_hour' => 24,
        ]))
        ->assertSessionHasErrors('daily_digest_hour');
});

test('disabled channels are not required in the request', function () {
    $user = userWithTeam();

    // Push is disabled in config; its fields must not be required.
    expect(NotificationPreference::editableFields())
        ->not->toContain('push_daily_digest');

    $this
        ->actingAs($user)
        ->patch(route('account.notifications.update'), notificationPayload())
        ->assertSessionHasNoErrors();
});

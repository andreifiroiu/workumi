<?php

use App\Models\User;
use Illuminate\Support\Facades\Gate;

it('allows users whose email is in the allowed list', function () {
    config(['log-viewer.allowed_emails' => ['admin@example.com']]);

    $user = User::factory()->create(['email' => 'admin@example.com']);

    expect(Gate::forUser($user)->allows('viewLogViewer'))->toBeTrue();
});

it('denies users whose email is not in the allowed list', function () {
    config(['log-viewer.allowed_emails' => ['admin@example.com']]);

    $user = User::factory()->create(['email' => 'someone@example.com']);

    expect(Gate::forUser($user)->allows('viewLogViewer'))->toBeFalse();
});

it('denies guests', function () {
    config(['log-viewer.allowed_emails' => ['admin@example.com']]);

    expect(Gate::allows('viewLogViewer'))->toBeFalse();
});

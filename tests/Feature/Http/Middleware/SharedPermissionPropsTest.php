<?php

declare(strict_types=1);

use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->owner = createTeamOwner();
    $this->team = $this->owner->currentTeam;
});

test('the owner receives the owner role code and both abilities', function () {
    $this->actingAs($this->owner)
        ->get('/today')
        ->assertInertia(fn (Assert $page) => $page
            ->where('auth.team.roleCode', 'owner')
            ->where('auth.team.isOwner', true)
            ->where('auth.can.administerTeam', true)
            ->where('auth.can.writeContent', true)
        );
});

test('role codes map to the expected shared abilities', function (string $roleCode, bool $administer, bool $write) {
    $user = createTeamUser($this->team, $roleCode);

    $this->actingAs($user)
        ->get('/today')
        ->assertInertia(fn (Assert $page) => $page
            ->where('auth.team.roleCode', $roleCode)
            ->where('auth.team.isOwner', false)
            ->where('auth.can.administerTeam', $administer)
            ->where('auth.can.writeContent', $write)
        );
})->with([
    'admin' => ['admin', true, true],
    'member' => ['member', false, true],
    'viewer' => ['viewer', false, false],
]);

test('the team role is namespaced away from the free-text job title', function () {
    $this->owner->forceFill(['role' => 'Senior Designer'])->save();

    $this->actingAs($this->owner)
        ->get('/today')
        ->assertInertia(fn (Assert $page) => $page
            // The job title still ships on the user object...
            ->where('auth.user.role', 'Senior Designer')
            // ...while the authorization role lives under auth.team.
            ->where('auth.team.roleCode', 'owner')
        );
});

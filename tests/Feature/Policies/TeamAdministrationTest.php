<?php

declare(strict_types=1);

use App\Models\User;

beforeEach(function () {
    $this->owner = createTeamOwner();
    $this->team = $this->owner->currentTeam;

    $this->admin = createTeamUser($this->team, 'admin');
    $this->member = createTeamUser($this->team, 'member');
    $this->viewer = createTeamUser($this->team, 'viewer');
});

/**
 * Every route behind the workspace administration gate.
 */
dataset('admin routes', [
    'workspace settings page' => ['get', 'settings.index'],
    'update workspace' => ['patch', 'settings.workspace.update'],
    'update global AI settings' => ['patch', 'settings.global-ai.update'],
    'rates list' => ['get', 'settings.rates.index'],
    'create rate' => ['post', 'settings.rates.store'],
    'audit log export' => ['get', 'settings.audit-log.export'],
    'create API key' => ['post', 'settings.api-keys.store'],
    'create AI agent' => ['post', 'settings.agents.store'],
    'agent templates' => ['get', 'settings.agent-templates.index'],
    'agent workflow states' => ['get', 'settings.workflow-states.index'],
    'invitations list' => ['get', 'settings.invitations.index'],
    'add team member' => ['post', 'settings.team-members.store'],
    'profitability report' => ['get', 'reports.profitability.index'],
]);

test('the team owner is not blocked by the administration gate', function (string $method, string $route) {
    $response = $this->actingAs($this->owner)->$method(route($route));

    expect($response->status())->not->toBe(403);
})->with('admin routes');

test('a user with the admin role is not blocked by the administration gate', function (string $method, string $route) {
    $response = $this->actingAs($this->admin)->$method(route($route));

    expect($response->status())->not->toBe(403);
})->with('admin routes');

test('a member is forbidden from every administration route', function (string $method, string $route) {
    $this->actingAs($this->member)
        ->$method(route($route))
        ->assertForbidden();
})->with('admin routes');

test('a viewer is forbidden from every administration route', function (string $method, string $route) {
    $this->actingAs($this->viewer)
        ->$method(route($route))
        ->assertForbidden();
})->with('admin routes');

test('a user from another team is forbidden from administration routes', function () {
    $outsider = createTeamOwner();

    $this->actingAs($outsider)
        ->get(route('settings.index'))
        ->assertOk();

    // ...but only for their own team; they never see this team's settings.
    expect($outsider->canAdministerTeam($this->team))->toBeFalse();
});

test('members and viewers can still reach their own account settings', function () {
    foreach ([$this->member, $this->viewer] as $user) {
        $this->actingAs($user)->get(route('account.profile.edit'))->assertOk();
        $this->actingAs($user)->get(route('account.api-tokens.index'))->assertOk();
    }
});

test('time reports stay available to members and viewers', function () {
    $this->actingAs($this->member)->get(route('reports.time.index'))->assertOk();
    $this->actingAs($this->viewer)->get(route('reports.time.index'))->assertOk();
});

test('the owner remains the only user who can delete the team', function () {
    expect($this->owner->can('delete', $this->team))->toBeTrue()
        ->and($this->admin->can('delete', $this->team))->toBeFalse()
        ->and($this->member->can('delete', $this->team))->toBeFalse();
});

test('an admin can manage team members but a member cannot', function () {
    expect($this->admin->can('addTeamMember', $this->team))->toBeTrue()
        ->and($this->admin->can('removeTeamMember', $this->team))->toBeTrue()
        ->and($this->member->can('addTeamMember', $this->team))->toBeFalse()
        ->and($this->viewer->can('removeTeamMember', $this->team))->toBeFalse();
});

test('a user with no team cannot administer anything', function () {
    $teamless = User::factory()->create();

    expect($teamless->canAdministerTeam(null))->toBeFalse();
});

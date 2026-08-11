<?php

use App\Models\Invitation;
use App\Models\Team;
use App\Models\User;
use Illuminate\Support\Facades\URL;
use Inertia\Testing\AssertableInertia as Assert;

function invitationFor(string $email, ?Team $team = null, string $roleCode = 'member'): Invitation
{
    $team ??= Team::factory()->create();

    return $team->invitations()->create([
        'email' => $email,
        'role_id' => $team->getRole($roleCode)->id,
    ]);
}

test('the register page prefills the invited email address', function () {
    $response = $this->get('/register?email=invited%40example.com');

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('auth/register')
        ->where('email', 'invited@example.com')
    );
});

test('the register page has no prefilled email when none is passed', function () {
    $response = $this->get('/register');

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('auth/register')
        ->where('email', null)
    );
});

test('the login page prefills the invited email address', function () {
    $response = $this->get('/login?email=invited%40example.com');

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('auth/login')
        ->where('email', 'invited@example.com')
    );
});

test('the accept page shows the role the invitation was actually sent for', function () {
    $team = Team::factory()->create();
    $invitation = invitationFor('invited@example.com', $team, 'viewer');

    $response = $this->get(URL::signedRoute('teams.invitations.accept', ['invitation' => $invitation]));

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('invitations/accept')
        ->where('invitation.roleName', 'Viewer')
    );

    expect($invitation->role->id)->toBe($team->getRole('viewer')->id);
});

test('pending invitations list the role they were sent for', function () {
    $team = Team::factory()->create();
    invitationFor('invited@example.com', $team, 'viewer');

    $response = $this->actingAs($team->owner)->get('/settings?tab=team');

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->where('pendingInvitations.0.role', 'Viewer')
    );
});

test('accepting an invitation stores it in the session and redirects to register', function () {
    $invitation = invitationFor('invited@example.com');

    $response = $this->post(URL::signedRoute('teams.invitations.accept.post', ['invitation' => $invitation]));

    $response->assertRedirect(route('register', ['email' => 'invited@example.com']));
    $response->assertSessionHas('pending_invitation_id', $invitation->id);
});

test('registering with a pending invitation joins the inviting team instead of creating a personal one', function () {
    $team = Team::factory()->create();
    $invitation = invitationFor('invited@example.com', $team);

    $response = $this->withSession(['pending_invitation_id' => $invitation->id])
        ->post('/register', [
            'name' => 'Invited Person',
            'email' => 'invited@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

    $response->assertRedirect(route('dashboard'));

    $user = User::where('email', 'invited@example.com')->firstOrFail();

    expect($user->current_team_id)->toBe($team->id)
        ->and($team->fresh()->users->pluck('id')->all())->toContain($user->id)
        ->and($user->ownedTeams()->count())->toBe(0);

    $this->assertDatabaseMissing('invitations', ['id' => $invitation->id]);
});

test('registering with a different email keeps the invitation and creates a personal team', function () {
    $team = Team::factory()->create();
    $invitation = invitationFor('invited@example.com', $team);

    $this->withSession(['pending_invitation_id' => $invitation->id])
        ->post('/register', [
            'name' => 'Someone Else',
            'email' => 'someone-else@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

    $user = User::where('email', 'someone-else@example.com')->firstOrFail();

    expect($user->ownedTeams()->count())->toBe(1)
        ->and($user->current_team_id)->toBe($user->ownedTeams()->first()->id)
        ->and($team->fresh()->users)->toBeEmpty();

    $this->assertDatabaseHas('invitations', ['id' => $invitation->id]);
});

test('an invitation is honoured even when the session lost the pending id', function () {
    $team = Team::factory()->create();
    invitationFor('invited@example.com', $team);

    $this->post('/register', [
        'name' => 'Invited Person',
        'email' => 'invited@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
    ]);

    $user = User::where('email', 'invited@example.com')->firstOrFail();

    expect($user->current_team_id)->toBe($team->id)
        ->and($user->ownedTeams()->count())->toBe(0);
});

test('an existing user logging in with a pending invitation joins the team', function () {
    $team = Team::factory()->create();
    $user = User::factory()->withoutTwoFactor()->create(['email' => 'invited@example.com']);
    $personalTeam = $user->createTeam(['name' => 'Personal']);
    $user->update(['current_team_id' => $personalTeam->id]);

    $invitation = invitationFor('invited@example.com', $team);

    $response = $this->withSession(['pending_invitation_id' => $invitation->id])
        ->post('/login', [
            'email' => 'invited@example.com',
            'password' => 'password',
        ]);

    $response->assertRedirect(route('dashboard'));

    expect($user->fresh()->current_team_id)->toBe($team->id)
        ->and($team->fresh()->users->pluck('id')->all())->toContain($user->id);
});

test('an invited member can actually open the page they are redirected to after registering', function () {
    $team = Team::factory()->create();
    $invitation = invitationFor('invited@example.com', $team);

    $response = $this->withSession(['pending_invitation_id' => $invitation->id])
        ->post('/register', [
            'name' => 'Invited Person',
            'email' => 'invited@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

    $user = User::where('email', 'invited@example.com')->firstOrFail();

    // The invited member cannot administer the team, so any admin-only landing page 403s on them.
    expect($user->canAdministerTeam())->toBeFalse();

    $this->followingRedirects()
        ->actingAs($user)
        ->get($response->headers->get('Location'))
        ->assertOk();
});

test('an invited viewer can open the page they are redirected to after registering', function () {
    $team = Team::factory()->create();
    $invitation = invitationFor('invited@example.com', $team, 'viewer');

    $response = $this->withSession(['pending_invitation_id' => $invitation->id])
        ->post('/register', [
            'name' => 'Invited Viewer',
            'email' => 'invited@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

    $user = User::where('email', 'invited@example.com')->firstOrFail();

    $this->followingRedirects()
        ->actingAs($user)
        ->get($response->headers->get('Location'))
        ->assertOk();
});

test('an already logged in user accepting an invitation lands on a page they may open', function () {
    $team = Team::factory()->create();
    $user = User::factory()->create(['email' => 'invited@example.com']);
    $personalTeam = $user->createTeam(['name' => 'Personal']);
    $user->update(['current_team_id' => $personalTeam->id]);

    $invitation = invitationFor('invited@example.com', $team);

    $response = $this->actingAs($user)
        ->post(URL::signedRoute('teams.invitations.accept.post', ['invitation' => $invitation]));

    $response->assertRedirect(route('dashboard'));
    $response->assertSessionHas('status', "You've been added to {$team->name}!");

    expect($user->fresh()->current_team_id)->toBe($team->id)
        ->and($user->canAdministerTeam())->toBeFalse();

    $this->followingRedirects()
        ->actingAs($user->fresh())
        ->get($response->headers->get('Location'))
        ->assertOk();
});

test('an invitation that cannot be accepted does not break the request', function () {
    $team = Team::factory()->create();

    // The team owner already belongs to the team, so accepting throws inside the package.
    $invitation = invitationFor($team->owner->email, $team);

    $user = User::factory()->create(['email' => 'someone@example.com']);
    $personalTeam = $user->createTeam(['name' => 'Personal']);
    $user->update(['current_team_id' => $personalTeam->id]);

    $response = $this->withSession(['pending_invitation_id' => $invitation->id])
        ->actingAs($user)
        ->get('/today');

    $response->assertOk();
    $this->assertDatabaseHas('invitations', ['id' => $invitation->id]);
});

test('a user without a current team still gets usable shared props', function () {
    $user = User::factory()->create();
    $team = $user->createTeam(['name' => 'Solo']);
    $user->forceFill(['current_team_id' => null])->save();

    $response = $this->actingAs($user)->get('/today');

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->where('currentOrganization.id', $team->id)
    );
});

test('a missing current team is repaired on the same request that needs it', function () {
    $user = User::factory()->create();
    $team = $user->createTeam(['name' => 'Solo']);
    $user->forceFill(['current_team_id' => null])->save();

    $this->actingAs($user)->get('/today')->assertOk();

    expect($user->fresh()->current_team_id)->toBe($team->id);
});

test('a user with no team at all gets one before shared props are computed', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->get('/today');

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->where('currentOrganization.name', "{$user->name}'s Team")
    );
});

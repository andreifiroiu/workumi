<?php

namespace App\Actions\Fortify;

use App\Actions\Teams\AcceptTeamInvitation;
use App\Models\User;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Laravel\Fortify\Contracts\CreatesNewUsers;

class CreateNewUser implements CreatesNewUsers
{
    use PasswordValidationRules;

    public function __construct(private AcceptTeamInvitation $acceptTeamInvitation) {}

    /**
     * Validate and create a newly registered user.
     *
     * @param  array<string, string>  $input
     */
    public function create(array $input): User
    {
        Validator::make($input, [
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'string',
                'email',
                'max:255',
                Rule::unique(User::class),
            ],
            'password' => $this->passwordRules(),
        ])->validate();

        $user = User::create([
            'name' => $input['name'],
            'email' => $input['email'],
            'password' => $input['password'],
        ]);

        if ($this->joinInvitedTeam($user)) {
            return $user;
        }

        // Create default team
        $team = $user->createTeam([
            'name' => $input['name']."'s Team",
        ]);

        // Set as current team
        $user->update(['current_team_id' => $team->id]);

        return $user;
    }

    /**
     * Join the user to the team that invited them, if an invitation is pending for their address.
     *
     * Invited users must not get a throwaway personal team; a failed join falls back to one so the
     * user is never left without a current team.
     */
    private function joinInvitedTeam(User $user): bool
    {
        $invitation = $this->acceptTeamInvitation->pendingFor(
            $user->email,
            session('pending_invitation_id'),
        );

        if (! $invitation) {
            return false;
        }

        if (! $this->acceptTeamInvitation->accept($user, $invitation)) {
            return false;
        }

        session()->forget('pending_invitation_id');
        session(['invitation_joined_team' => $invitation->team->name]);

        return true;
    }
}

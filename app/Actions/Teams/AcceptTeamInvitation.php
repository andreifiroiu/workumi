<?php

namespace App\Actions\Teams;

use App\Models\Invitation;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

class AcceptTeamInvitation
{
    /**
     * Resolve the invitation a user should be joined to, if any.
     *
     * The invitation id stashed in the session by the accept link wins; otherwise fall back to the
     * oldest invitation addressed to this email so an abandoned registration can still be recovered.
     */
    public function pendingFor(string $email, ?int $sessionInvitationId = null): ?Invitation
    {
        if ($sessionInvitationId) {
            $invitation = Invitation::with('team')->find($sessionInvitationId);

            if ($invitation && $invitation->email === $email) {
                return $invitation;
            }
        }

        return Invitation::with('team')
            ->where('email', $email)
            ->oldest('id')
            ->first();
    }

    /**
     * Join the user to the invited team and make it their current team.
     *
     * Returns false (and logs) instead of throwing, so a bad invitation can never break registration
     * or login halfway through.
     */
    public function accept(User $user, Invitation $invitation): bool
    {
        if ($invitation->email !== $user->email) {
            return false;
        }

        $team = $invitation->team;

        if (! $team) {
            return false;
        }

        try {
            DB::transaction(function () use ($user, $invitation, $team): void {
                $team->inviteAccept($invitation->id);
                $user->switchTeam($team);
            });
        } catch (Throwable $e) {
            Log::warning('Unable to accept team invitation.', [
                'invitation_id' => $invitation->id,
                'team_id' => $team->id,
                'user_id' => $user->id,
                'exception' => $e->getMessage(),
            ]);

            return false;
        }

        return true;
    }
}

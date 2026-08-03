<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\Invitation;
use Illuminate\Http\Request;

class InvitationController extends Controller
{
    /**
     * List pending invitations for the current team.
     */
    public function index(Request $request)
    {
        $team = $request->user()->currentTeam;

        $this->authorize('view', $team);

        $invitations = $team->invitations()
            ->with('role')
            ->get()
            ->map(fn ($invitation) => [
                'id' => $invitation->id,
                'email' => $invitation->email,
                'role' => $invitation->role?->name ?? 'Member',
                'roleId' => $invitation->role_id,
                'createdAt' => $invitation->created_at->toISOString(),
            ]);

        return response()->json([
            'invitations' => $invitations,
        ]);
    }

    /**
     * Cancel (delete) a pending invitation.
     */
    public function destroy(Request $request, Invitation $invitation)
    {
        $team = $request->user()->currentTeam;

        $this->authorize('removeTeamMember', $team);

        // Ensure the invitation belongs to the current team
        if ($invitation->team_id !== $team->id) {
            abort(403, 'This invitation does not belong to your team.');
        }

        $invitation->delete();

        return back()->with('status', 'Invitation cancelled successfully.');
    }
}

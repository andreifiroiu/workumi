<?php

namespace App\Http\Controllers;

use App\Actions\Teams\AcceptTeamInvitation;
use App\Models\Invitation;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

class InvitationAcceptController extends Controller
{
    public function __construct(private AcceptTeamInvitation $acceptTeamInvitation) {}

    /**
     * Show the invitation accept page.
     */
    public function show(Request $request, Invitation $invitation)
    {
        $invitation->load(['team', 'role']);

        return Inertia::render('invitations/accept', [
            'invitation' => [
                'id' => $invitation->id,
                'email' => $invitation->email,
                'teamName' => $invitation->team->name,
                'roleName' => $invitation->role?->name ?? 'Member',
            ],
            'isLoggedIn' => auth()->check(),
            'currentUserEmail' => auth()->user()?->email,
        ]);
    }

    /**
     * Accept the invitation.
     */
    public function accept(Request $request, Invitation $invitation)
    {
        $invitation->load(['team', 'role']);

        // If not logged in, redirect to login/register with redirect back
        if (! auth()->check()) {
            // Store invitation ID in session for post-registration/login processing
            session(['pending_invitation_id' => $invitation->id]);

            // Check if user exists with this email
            $userExists = User::where('email', $invitation->email)->exists();

            if ($userExists) {
                return redirect()->route('login', [
                    'email' => $invitation->email,
                ]);
            }

            return redirect()->route('register', [
                'email' => $invitation->email,
            ]);
        }

        $user = auth()->user();

        // Verify the logged-in user's email matches the invitation
        if ($user->email !== $invitation->email) {
            return back()->withErrors([
                'email' => 'This invitation was sent to a different email address. Please log in with the correct account.',
            ]);
        }

        $teamName = $invitation->team->name;

        if (! $this->acceptTeamInvitation->accept($user, $invitation)) {
            return back()->withErrors([
                'email' => 'We could not add you to this team. Please ask the team owner to send a new invitation.',
            ]);
        }

        session()->forget('pending_invitation_id');

        // The team settings tab is behind `team.admin`, so sending an invited member or viewer
        // there answers them with a 403. The dashboard is reachable by every role.
        return redirect()->route('dashboard')
            ->with('status', "You've been added to {$teamName}!");
    }
}

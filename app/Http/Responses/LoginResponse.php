<?php

namespace App\Http\Responses;

use App\Actions\Teams\AcceptTeamInvitation;
use Illuminate\Http\JsonResponse;
use Laravel\Fortify\Contracts\LoginResponse as LoginResponseContract;
use Laravel\Fortify\Contracts\TwoFactorLoginResponse as TwoFactorLoginResponseContract;
use Laravel\Fortify\Fortify;
use Symfony\Component\HttpFoundation\Response;

class LoginResponse implements LoginResponseContract, TwoFactorLoginResponseContract
{
    public function __construct(private AcceptTeamInvitation $acceptTeamInvitation) {}

    /**
     * Create an HTTP response that represents the object.
     */
    public function toResponse($request): Response
    {
        $invitationId = session()->pull('pending_invitation_id');
        $user = $request->user();

        if ($invitationId && $user) {
            $invitation = $this->acceptTeamInvitation->pendingFor($user->email, $invitationId);

            // Land invited users where an ordinary login lands. The team settings tab is behind
            // `team.admin`, so sending an invited member or viewer there answers them with a 403.
            if ($invitation && $this->acceptTeamInvitation->accept($user, $invitation)) {
                return redirect()->intended(Fortify::redirects('login'))
                    ->with('status', "You've been added to {$invitation->team->name}!");
            }
        }

        // Default Fortify behavior
        return $request->wantsJson()
            ? new JsonResponse('', 200)
            : redirect()->intended(Fortify::redirects('login'));
    }
}

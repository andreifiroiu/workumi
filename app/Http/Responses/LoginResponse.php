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

            if ($invitation && $this->acceptTeamInvitation->accept($user, $invitation)) {
                return redirect()->route('settings.index', ['tab' => 'team'])
                    ->with('status', "You've been added to {$invitation->team->name}!");
            }
        }

        // Default Fortify behavior
        return $request->wantsJson()
            ? new JsonResponse('', 200)
            : redirect()->intended(Fortify::redirects('login'));
    }
}

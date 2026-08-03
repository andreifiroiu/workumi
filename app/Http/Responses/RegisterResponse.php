<?php

namespace App\Http\Responses;

use Illuminate\Http\JsonResponse;
use Laravel\Fortify\Contracts\RegisterResponse as RegisterResponseContract;
use Laravel\Fortify\Fortify;
use Symfony\Component\HttpFoundation\Response;

class RegisterResponse implements RegisterResponseContract
{
    /**
     * Create an HTTP response that represents the object.
     */
    public function toResponse($request): Response
    {
        // CreateNewUser already joined the user to the inviting team when an invitation was pending.
        $joinedTeam = session()->pull('invitation_joined_team');

        session()->forget('pending_invitation_id');

        if ($joinedTeam && ! $request->wantsJson()) {
            return redirect()->route('settings.index', ['tab' => 'team'])
                ->with('status', "You've been added to {$joinedTeam}!");
        }

        // Default Fortify behavior
        return $request->wantsJson()
            ? new JsonResponse('', 201)
            : redirect()->intended(Fortify::redirects('register'));
    }
}

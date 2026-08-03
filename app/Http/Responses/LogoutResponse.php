<?php

namespace App\Http\Responses;

use Illuminate\Http\JsonResponse;
use Inertia\Inertia;
use Laravel\Fortify\Contracts\LogoutResponse as LogoutResponseContract;
use Laravel\Fortify\Fortify;
use Symfony\Component\HttpFoundation\Response;

class LogoutResponse implements LogoutResponseContract
{
    /**
     * Create an HTTP response that represents the object.
     */
    public function toResponse($request): Response
    {
        if ($request->wantsJson()) {
            return new JsonResponse('', 204);
        }

        // Logging out lands on the marketing site, which is a Folio Blade page rather than an
        // Inertia response. A plain redirect would make the Inertia client render that HTML in its
        // error modal over the app; Inertia::location forces a full page visit instead.
        return Inertia::location(Fortify::redirects('logout', '/'));
    }
}

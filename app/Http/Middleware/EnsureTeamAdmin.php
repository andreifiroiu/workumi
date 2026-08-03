<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Restrict a route to users who may administer their current team.
 *
 * Acts as the perimeter for the workspace administration surface. Individual
 * controllers still authorize the `administer` ability so that the rule holds
 * even when a route is reached by another path.
 *
 * Must run after EnsureUserHasTeam so that a current team is resolved.
 */
class EnsureTeamAdmin
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        abort_unless($user !== null && $user->canAdministerTeam(), 403);

        return $next($request);
    }
}

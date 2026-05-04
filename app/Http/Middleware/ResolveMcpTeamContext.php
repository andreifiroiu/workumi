<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Mcp\TeamContext;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ResolveMcpTeamContext
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        $team = $user->current_team;

        if ($team === null) {
            abort(403, 'No team found for this user.');
        }

        app()->instance(TeamContext::class, new TeamContext($team->id));

        return $next($request);
    }
}

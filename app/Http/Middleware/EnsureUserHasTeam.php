<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserHasTeam
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next)
    {
        $user = Auth::user();

        if (! $user) {
            return $next($request);
        }

        // Create default team if user has none
        if ($user->allTeams()->count() === 0) {
            $team = $user->createTeam([
                'name' => $user->name."'s Team",
            ]);

            $user->update(['current_team_id' => $team->id]);

            return $next($request);
        }

        // Repair a missing current team, or one pointing at a team that no longer resolves
        if (! $user->current_team_id || ! $user->currentTeam()->first()) {
            $firstTeam = $user->allTeams()->first();

            if ($firstTeam) {
                $user->update(['current_team_id' => $firstTeam->id]);
            }
        }

        return $next($request);
    }
}

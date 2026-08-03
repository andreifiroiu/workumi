<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Support\TeamAccess;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Binds the set of teams the authenticated token may reach.
 *
 * Access tokens are user-oriented: they reach every team the user belongs to,
 * unless the token itself was restricted to a subset when it was created.
 */
class ResolveTeamAccess
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        $teamIds = $user->allTeams()
            ->pluck('id')
            ->map(fn ($id): int => (int) $id)
            ->all();

        $restriction = $this->tokenTeamRestriction($request);

        if ($restriction !== null) {
            $teamIds = array_values(array_intersect($teamIds, $restriction));
        }

        if ($teamIds === []) {
            abort(403, 'This token has access to no teams.');
        }

        $currentTeamId = $user->current_team_id !== null ? (int) $user->current_team_id : null;

        $defaultTeamId = $currentTeamId !== null && in_array($currentTeamId, $teamIds, true)
            ? $currentTeamId
            : $teamIds[0];

        app()->instance(TeamAccess::class, new TeamAccess($teamIds, $defaultTeamId));

        return $next($request);
    }

    /**
     * The team IDs this token was pinned to, or null when it is unrestricted.
     *
     * @return list<int>|null
     */
    private function tokenTeamRestriction(Request $request): ?array
    {
        $token = $request->user()?->currentAccessToken();

        if ($token === null || ! isset($token->team_ids) || $token->team_ids === []) {
            return null;
        }

        return array_values(array_map('intval', $token->team_ids));
    }
}

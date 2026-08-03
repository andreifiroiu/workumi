<?php

declare(strict_types=1);

namespace App\Mcp\Concerns;

use App\Support\TeamMembership;
use Closure;
use Laravel\Mcp\Request;

trait RequiresWriteAbility
{
    protected function authorizeWrite(Request $request): void
    {
        $user = $request->user();

        if ($user === null) {
            return;
        }

        if ($user->tokenCan('*') || $user->tokenCan('write')) {
            return;
        }

        abort(403, 'This token is read-only.');
    }

    /**
     * Returns a validation closure that ensures the given user ID belongs to the team.
     * Checks both team members (team_user pivot) and the team owner (teams.user_id).
     */
    protected function teamMemberRule(int $teamId): Closure
    {
        return TeamMembership::rule($teamId);
    }
}

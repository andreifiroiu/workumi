<?php

declare(strict_types=1);

namespace App\Mcp\Concerns;

use App\Models\Team;
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
     * Refuse the write when the caller holds a read-only role in the target team.
     *
     * authorizeWrite() establishes that the token may write; this establishes
     * that its user may. A token is not team-scoped — it reaches every team its
     * user belongs to — so the role can only be checked once the tool has
     * resolved which team it is acting on, hence the separate call.
     *
     * Note OAuthUser::tokenCan() returns true unconditionally, so for MCP
     * clients this is the only check that constrains a `viewer` at all.
     */
    protected function authorizeTeamWrite(Request $request, int $teamId): void
    {
        $user = $request->user();
        $team = Team::find($teamId);

        if ($user === null || $team === null || ! $user->canWriteTeamContent($team)) {
            abort(403, 'Your role in this team does not allow writing.');
        }
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

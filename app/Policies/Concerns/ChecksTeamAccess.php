<?php

declare(strict_types=1);

namespace App\Policies\Concerns;

use App\Models\Team;
use App\Models\User;

/**
 * Shared team-scope and role checks for the content policies.
 *
 * Three tiers:
 *   inTeam()        read.  Any role, including `viewer`.
 *   canWrite()      write. owner, admin, member. Excludes `viewer`.
 *   canAdminister() admin. owner, admin.
 */
trait ChecksTeamAccess
{
    /**
     * The acting user's current team, but only when it matches $teamId.
     *
     * Deliberately does not call belongsToTeam(): current_team_id is already a
     * membership assertion, because switchTeam() refuses to set it for a
     * non-member and EnsureUserHasTeam only ever picks from allTeams().
     */
    protected function teamFor(User $user, ?int $teamId): ?Team
    {
        $team = $user->currentTeam;

        return ($team !== null && $teamId !== null && $team->id === $teamId) ? $team : null;
    }

    /**
     * Read access: the model belongs to the user's current team.
     */
    protected function inTeam(User $user, ?int $teamId): bool
    {
        return $this->teamFor($user, $teamId) !== null;
    }

    /**
     * Write access: in the team, and not a read-only `viewer`.
     */
    protected function canWrite(User $user, ?int $teamId): bool
    {
        $team = $this->teamFor($user, $teamId);

        return $team !== null && $user->canWriteTeamContent($team);
    }

    /**
     * Administrative access: in the team, and owner or `admin`.
     */
    protected function canAdminister(User $user, ?int $teamId): bool
    {
        $team = $this->teamFor($user, $teamId);

        return $team !== null && $user->canAdministerTeam($team);
    }

    /**
     * Write access for a create() ability, where there is no model yet.
     */
    protected function canWriteInCurrentTeam(User $user): bool
    {
        return $this->canWrite($user, $user->currentTeam?->id);
    }
}

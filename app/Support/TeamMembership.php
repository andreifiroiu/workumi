<?php

declare(strict_types=1);

namespace App\Support;

use Closure;
use Illuminate\Support\Facades\DB;

/**
 * Team membership checks that cover both the pivot and team ownership.
 *
 * Owners are deliberately not inserted into `team_user` (see User::createTeam),
 * so a membership check has to look at `teams.user_id` as well.
 */
final class TeamMembership
{
    public static function includes(int $teamId, int $userId): bool
    {
        $isMember = DB::table('team_user')
            ->where('team_id', $teamId)
            ->where('user_id', $userId)
            ->exists();

        if ($isMember) {
            return true;
        }

        return DB::table('teams')
            ->where('id', $teamId)
            ->where('user_id', $userId)
            ->exists();
    }

    /**
     * A validation rule asserting the value is a user ID within the given team.
     */
    public static function rule(int $teamId): Closure
    {
        return function (string $attribute, mixed $value, Closure $fail) use ($teamId): void {
            if (! self::includes($teamId, (int) $value)) {
                $fail('The selected user does not belong to this team.');
            }
        };
    }
}

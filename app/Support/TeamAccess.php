<?php

declare(strict_types=1);

namespace App\Support;

use App\Models\Team;
use Illuminate\Validation\ValidationException;

/**
 * Who is acting, and which teams they may act on.
 *
 * Access tokens represent a user, not a team, so this holds every team the
 * authenticated user belongs to (optionally narrowed by a per-token
 * restriction) plus the team to fall back on when the caller does not name one.
 *
 * The user ID is carried alongside because team membership is not the only
 * access rule: private projects are further limited to the people with a RACI
 * role on them, exactly as in the web app.
 */
final class TeamAccess
{
    /**
     * @param  list<int>  $teamIds
     */
    public function __construct(
        public readonly int $userId,
        public readonly array $teamIds,
        public readonly ?int $defaultTeamId,
    ) {}

    public function allows(int $teamId): bool
    {
        return in_array($teamId, $this->teamIds, true);
    }

    /**
     * Abort when the given team is outside this request's reach.
     */
    public function assert(int $teamId): void
    {
        if (! $this->allows($teamId)) {
            abort(403, 'You do not have access to team '.$teamId.'.');
        }
    }

    /**
     * Resolve the team to write to. An explicit team must be accessible; when
     * none is given the default team is used, unless several teams are
     * reachable and the choice would be ambiguous.
     */
    public function resolve(?int $teamId): int
    {
        if ($teamId !== null) {
            $this->assert($teamId);

            return $teamId;
        }

        if (count($this->teamIds) > 1) {
            // A ValidationException rather than abort(422) so this reads like
            // every other rejected field: an `errors.team_id` entry on the API,
            // and a tool error rather than a transport error over MCP.
            throw ValidationException::withMessages([
                'team_id' => 'team_id is required: you have access to teams '.$this->describeTeams().'.',
            ]);
        }

        if ($this->defaultTeamId === null) {
            abort(403, 'This token has access to no teams.');
        }

        return $this->defaultTeamId;
    }

    /**
     * Team IDs to filter a list query by: just the requested team, or all of them.
     *
     * @return list<int>
     */
    public function filter(?int $teamId): array
    {
        if ($teamId === null) {
            return $this->teamIds;
        }

        $this->assert($teamId);

        return [$teamId];
    }

    private function describeTeams(): string
    {
        $names = Team::query()
            ->whereIn('id', $this->teamIds)
            ->orderBy('name')
            ->pluck('name', 'id')
            ->map(fn (string $name, int $id): string => $id.' ('.$name.')')
            ->values();

        return $names->implode(', ');
    }
}

<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Concerns;

use App\Models\Team;
use App\Support\TeamAccess;
use Illuminate\Auth\Access\AuthorizationException;

/**
 * Access tokens reach every team their user belongs to, so an API request
 * either names a team explicitly or inherits one from the record it acts on.
 * This exposes the request's reachable teams to rules() and to the controller.
 */
trait ResolvesTeamScope
{
    protected function teamAccess(): TeamAccess
    {
        return app(TeamAccess::class);
    }

    /**
     * The team this request writes to, known only once validation has resolved
     * the target record or an explicit team_id.
     */
    abstract protected function targetTeamId(): int;

    /**
     * Refuse the write when the caller holds a read-only role in that team.
     *
     * A token's write ability says the token may write; it says nothing about
     * whether its user may. EnsureTokenCanWrite covers the former, this covers
     * the latter, so a `viewer` cannot do through the API what they are refused
     * in the web app.
     *
     * Runs after validation rather than in authorize() because the target team
     * is derived from a parent record, and the store rules deliberately report
     * an unreachable parent as a 422. Resolving it earlier would turn that into
     * a 404 and report the same refusal two different ways.
     */
    protected function passedValidation(): void
    {
        $user = $this->user();
        $team = Team::find($this->targetTeamId());

        if ($user === null || $team === null || ! $user->canWriteTeamContent($team)) {
            throw new AuthorizationException('Your role in this team does not allow writing.');
        }
    }
}

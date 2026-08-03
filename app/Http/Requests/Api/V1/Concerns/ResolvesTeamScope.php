<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Concerns;

use App\Support\TeamAccess;

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
}

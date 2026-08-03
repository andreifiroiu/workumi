<?php

declare(strict_types=1);

namespace App\Models;

use App\Http\Middleware\ResolveTeamAccess;
use Laravel\Sanctum\PersonalAccessToken as SanctumPersonalAccessToken;

/**
 * A user-oriented access token.
 *
 * A null `team_ids` means the token reaches every team its user belongs to,
 * including teams they join later. A non-empty array restricts it to those
 * teams; the restriction is enforced in {@see ResolveTeamAccess}.
 *
 * @property array<int, int>|null $team_ids
 */
class PersonalAccessToken extends SanctumPersonalAccessToken
{
    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'team_ids' => 'array',
        ];
    }
}

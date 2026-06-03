<?php

declare(strict_types=1);

namespace App\Models;

/**
 * OAuth-facing representation of a {@see User}, backed by the same `users` table.
 *
 * Laravel Passport's "api" guard authenticates instances of this subclass so the
 * base User model can keep Laravel Sanctum's HasApiTokens trait (which powers the
 * personal access token UI). Passport's token guard only duck-types
 * withAccessToken() — inherited from Sanctum and behaviourally identical — so no
 * Passport trait or OAuthenticatable interface is required here, which avoids the
 * createToken() signature clash between the two packages.
 */
class OAuthUser extends User
{
    protected $table = 'users';

    /**
     * OAuth is used purely as a translation layer to the underlying user; the
     * only granted scope is `mcp:use`. Scopes are not used for authorization,
     * so an OAuth-authenticated user has full (read/write) access to MCP tools.
     */
    public function tokenCan(string $ability)
    {
        return true;
    }
}

<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Mcp\Concerns\RequiresWriteAbility;
use Closure;
use Illuminate\Http\Request;
use Laravel\Passport\Contracts\ScopeAuthorizable;
use Symfony\Component\HttpFoundation\Response;

/**
 * Ensures OAuth-issued access tokens carry the `mcp:use` scope.
 *
 * The /mcp route accepts both Passport OAuth tokens and Sanctum personal access
 * tokens. Only Passport tokens are scoped, so this gate applies exclusively to
 * them: it rejects any OAuth token that was issued for a different purpose and
 * lacks `mcp:use`. Sanctum tokens (whose currentAccessToken() is not a Passport
 * ScopeAuthorizable) pass through untouched and remain governed by their
 * abilities via {@see RequiresWriteAbility}.
 */
class EnsureMcpScope
{
    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->user()?->currentAccessToken();

        if ($token instanceof ScopeAuthorizable && $token->cant('mcp:use')) {
            abort(403, 'This token is missing the required mcp:use scope.');
        }

        return $next($request);
    }
}

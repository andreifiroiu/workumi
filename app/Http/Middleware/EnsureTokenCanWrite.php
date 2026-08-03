<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Mcp\Concerns\RequiresWriteAbility;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Rejects read-only access tokens on write endpoints, matching the check the
 * MCP write tools apply in {@see RequiresWriteAbility}.
 */
class EnsureTokenCanWrite
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user !== null && ! $user->tokenCan('*') && ! $user->tokenCan('write')) {
            abort(403, 'This token is read-only.');
        }

        return $next($request);
    }
}

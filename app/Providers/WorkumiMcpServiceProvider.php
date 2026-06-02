<?php

declare(strict_types=1);

namespace App\Providers;

use App\Console\Commands\WorkumiMcpCommand;
use App\Http\Middleware\EnsureMcpScope;
use App\Http\Middleware\ResolveMcpTeamContext;
use App\Mcp\Servers\WorkumiServer;
use Illuminate\Support\ServiceProvider;
use Laravel\Mcp\Facades\Mcp;

class WorkumiMcpServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        // Local stdio transport (Claude Code CLI via .mcp.json)
        Mcp::local('workumi', WorkumiServer::class);

        // OAuth 2.1 discovery + dynamic client registration routes (Claude.ai connectors).
        Mcp::oauthRoutes();

        // HTTP transport (remote clients — Claude.ai, Claude Code remote, etc.).
        // Accepts Sanctum personal access tokens or Passport OAuth bearer tokens,
        // so both the CLI and the Claude app can connect. Sanctum is tried first:
        // it validates its own tokens (and silently ignores OAuth JWTs) without
        // the Passport guard reporting an OAuthServerException on every request.
        Mcp::web('/mcp', WorkumiServer::class)
            ->middleware(['auth:sanctum,api', EnsureMcpScope::class, ResolveMcpTeamContext::class]);

        if ($this->app->runningInConsole()) {
            $this->commands([WorkumiMcpCommand::class]);
        }
    }
}

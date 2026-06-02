<?php

declare(strict_types=1);

namespace App\Providers;

use App\Console\Commands\WorkumiMcpCommand;
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
        // Accepts Passport OAuth bearer tokens (api guard) or Sanctum personal
        // access tokens, so both the Claude app and CLI clients can connect.
        Mcp::web('/mcp', WorkumiServer::class)
            ->middleware(['auth:api,sanctum', ResolveMcpTeamContext::class]);

        if ($this->app->runningInConsole()) {
            $this->commands([WorkumiMcpCommand::class]);
        }
    }
}

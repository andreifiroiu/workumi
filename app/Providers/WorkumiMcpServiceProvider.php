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

        // HTTP transport (remote clients — Claude.ai, Claude Code remote, etc.)
        Mcp::web('/mcp', WorkumiServer::class)
            ->middleware(['auth:sanctum', ResolveMcpTeamContext::class]);

        if ($this->app->runningInConsole()) {
            $this->commands([WorkumiMcpCommand::class]);
        }
    }
}

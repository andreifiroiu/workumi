<?php

declare(strict_types=1);

namespace App\Providers;

use App\Console\Commands\WorkumiMcpCommand;
use App\Mcp\Servers\WorkumiServer;
use Illuminate\Support\ServiceProvider;
use Laravel\Mcp\Facades\Mcp;

class WorkumiMcpServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        Mcp::local('workumi', WorkumiServer::class);

        if ($this->app->runningInConsole()) {
            $this->commands([WorkumiMcpCommand::class]);
        }
    }
}

<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Mcp\TeamContext;
use Illuminate\Console\Command;
use Laravel\Mcp\Server\Registrar;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Input\InputOption;

#[AsCommand(name: 'workumi:mcp', description: 'Start the Workumi domain MCP server')]
class WorkumiMcpCommand extends Command
{
    public function handle(Registrar $registrar): int
    {
        $teamId = (int) $this->option('team');

        if ($teamId <= 0) {
            $this->components->error('A valid --team=ID is required.');

            return static::FAILURE;
        }

        $this->laravel->instance(TeamContext::class, new TeamContext($teamId));

        $server = $registrar->getLocalServer('workumi');

        if ($server === null) {
            $this->components->error('MCP server [workumi] is not registered.');

            return static::FAILURE;
        }

        $server();

        return static::SUCCESS;
    }

    protected function getOptions(): array
    {
        return [
            ['team', null, InputOption::VALUE_REQUIRED, 'The team ID to operate on.'],
        ];
    }
}

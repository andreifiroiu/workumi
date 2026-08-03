<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\User;
use App\Support\TeamAccess;
use Illuminate\Console\Command;
use Laravel\Mcp\Server\Registrar;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Input\InputOption;

#[AsCommand(name: 'workumi:mcp', description: 'Start the Workumi domain MCP server')]
class WorkumiMcpCommand extends Command
{
    public function handle(Registrar $registrar): int
    {
        $userId = (int) $this->option('user');

        if ($userId <= 0) {
            $this->components->error('A valid --user=ID is required.');

            return static::FAILURE;
        }

        $user = User::find($userId);

        if ($user === null) {
            $this->components->error("No user found with ID {$userId}.");

            return static::FAILURE;
        }

        $teamIds = $user->allTeams()->pluck('id')->map(fn ($id): int => (int) $id)->all();

        if ($teamIds === []) {
            $this->components->error("User {$userId} does not belong to any team.");

            return static::FAILURE;
        }

        $teamId = (int) $this->option('team');

        if ($teamId > 0) {
            if (! in_array($teamId, $teamIds, true)) {
                $this->components->error("User {$userId} does not belong to team {$teamId}.");

                return static::FAILURE;
            }

            $teamIds = [$teamId];
        }

        $defaultTeamId = $teamId > 0 ? $teamId : ((int) $user->current_team_id ?: $teamIds[0]);

        if (! in_array($defaultTeamId, $teamIds, true)) {
            $defaultTeamId = $teamIds[0];
        }

        $this->laravel->instance(TeamAccess::class, new TeamAccess($teamIds, $defaultTeamId));

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
            ['user', null, InputOption::VALUE_REQUIRED, 'The user ID to act as. Their team memberships determine what is reachable.'],
            ['team', null, InputOption::VALUE_OPTIONAL, 'Restrict the session to a single team the user belongs to. Defaults to all of their teams.'],
        ];
    }
}

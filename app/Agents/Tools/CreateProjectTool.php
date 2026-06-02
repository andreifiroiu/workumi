<?php

declare(strict_types=1);

namespace App\Agents\Tools;

use App\Contracts\Tools\ToolInterface;
use App\Enums\ProjectStatus;
use App\Models\Party;
use App\Models\Project;
use App\Models\Team;
use App\Models\User;
use Carbon\Carbon;
use InvalidArgumentException;

/**
 * Tool for creating projects from agent analysis.
 *
 * Creates an Active project. When no party is supplied, an "Internal" party
 * is resolved/created for the team so projects originating from sources such
 * as inbound email (which carry no client) can still be persisted.
 */
class CreateProjectTool implements ToolInterface
{
    /**
     * Get the unique identifier name for this tool.
     */
    public function name(): string
    {
        return 'create-project';
    }

    /**
     * Get a human-readable description of what this tool does.
     */
    public function description(): string
    {
        return 'Creates a new project for a team. If no party (client) is provided, an internal party is used. Returns the created project details.';
    }

    /**
     * Get the category this tool belongs to.
     */
    public function category(): string
    {
        return 'projects';
    }

    /**
     * Execute the tool with the given parameters.
     *
     * @param  array<string, mixed>  $params  The parameters for tool execution
     * @return array<string, mixed> The result data from execution
     *
     * @throws InvalidArgumentException If required parameters are missing or invalid
     */
    public function execute(array $params): array
    {
        $this->validateParams($params);

        $teamId = $params['team_id'];
        $name = $params['name'];

        $team = Team::find($teamId);
        if ($team === null) {
            throw new InvalidArgumentException("Team with ID {$teamId} not found");
        }

        $ownerId = $params['owner_id'];
        if (User::find($ownerId) === null) {
            throw new InvalidArgumentException("User with ID {$ownerId} not found");
        }

        $partyId = $params['party_id'] ?? self::resolveInternalParty($teamId)->id;

        $project = Project::create([
            'team_id' => $teamId,
            'party_id' => $partyId,
            'owner_id' => $ownerId,
            'accountable_id' => $ownerId,
            'name' => $name,
            'description' => $params['description'] ?? null,
            'status' => $this->parseStatus($params['status'] ?? 'active'),
            'start_date' => isset($params['start_date'])
                ? Carbon::parse($params['start_date'])
                : Carbon::now(),
        ]);

        return [
            'success' => true,
            'project' => [
                'id' => $project->id,
                'name' => $project->name,
                'description' => $project->description,
                'status' => $project->status->value,
                'party_id' => $project->party_id,
                'owner_id' => $project->owner_id,
                'team_id' => $project->team_id,
                'start_date' => $project->start_date?->toDateString(),
                'created_at' => $project->created_at->toIso8601String(),
            ],
        ];
    }

    /**
     * Find or create the team's internal party for partyless projects.
     */
    public static function resolveInternalParty(int $teamId): Party
    {
        return Party::firstOrCreate(
            ['team_id' => $teamId, 'name' => 'Internal'],
            ['type' => 'department'],
        );
    }

    /**
     * Get the parameter definitions for this tool.
     *
     * @return array<string, array{type: string, description: string, required: bool}>
     */
    public function getParameters(): array
    {
        return [
            'team_id' => [
                'type' => 'integer',
                'description' => 'The ID of the team to create the project for',
                'required' => true,
            ],
            'name' => [
                'type' => 'string',
                'description' => 'The name of the project',
                'required' => true,
            ],
            'description' => [
                'type' => 'string',
                'description' => 'Detailed description of the project',
                'required' => false,
            ],
            'party_id' => [
                'type' => 'integer',
                'description' => 'The ID of the client/party the project is for. Defaults to the team internal party.',
                'required' => false,
            ],
            'owner_id' => [
                'type' => 'integer',
                'description' => 'User ID of the project owner (also set as accountable)',
                'required' => true,
            ],
            'start_date' => [
                'type' => 'string',
                'description' => 'Project start date in YYYY-MM-DD format (defaults to today)',
                'required' => false,
            ],
            'status' => [
                'type' => 'string',
                'description' => 'Project status: active, on_hold, completed, or archived (default: active)',
                'required' => false,
            ],
        ];
    }

    /**
     * Validate required parameters.
     *
     * @param  array<string, mixed>  $params
     *
     * @throws InvalidArgumentException If required parameters are missing
     */
    private function validateParams(array $params): void
    {
        foreach (['team_id', 'name', 'owner_id'] as $param) {
            if (! isset($params[$param]) || $params[$param] === null || $params[$param] === '') {
                throw new InvalidArgumentException("{$param} is required");
            }
        }
    }

    /**
     * Parse a status string into the ProjectStatus enum.
     */
    private function parseStatus(string $status): ProjectStatus
    {
        return ProjectStatus::tryFrom(strtolower($status)) ?? ProjectStatus::Active;
    }
}

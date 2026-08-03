<?php

declare(strict_types=1);

namespace App\Mcp\Tools\Projects;

use App\Mcp\Concerns\RequiresWriteAbility;
use App\Models\Project;
use App\Support\TeamAccess;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\Validation\Rule;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Tool;

#[Description('Create a new project. Requires a party_id from the same team; pass team_id when you belong to more than one team. Returns the created project with its new ID.')]
class CreateProjectTool extends Tool
{
    use RequiresWriteAbility;

    public function handle(Request $request, TeamAccess $access): Response
    {
        $this->authorizeWrite($request);

        $identified = $request->validate([
            'team_id' => ['nullable', 'integer'],
        ]);

        $teamId = $access->resolve(isset($identified['team_id']) ? (int) $identified['team_id'] : null);

        $validated = $request->validate([
            'team_id' => ['nullable', 'integer'],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'status' => ['nullable', 'string', Rule::in(['active', 'on_hold', 'completed'])],
            'start_date' => ['nullable', 'date'],
            'target_end_date' => ['nullable', 'date'],
            // projects.party_id and projects.owner_id are both NOT NULL.
            'party_id' => ['required', 'integer', Rule::exists('parties', 'id')->where('team_id', $teamId)],
            'owner_id' => ['nullable', 'integer', $this->teamMemberRule($teamId)],
            'budget_hours' => ['nullable', 'numeric', 'min:0'],
            'budget_cost' => ['nullable', 'numeric', 'min:0'],
            'budget_type' => ['nullable', 'string', Rule::in(['fixed_price', 'time_and_materials', 'monthly_subscription'])],
            'is_private' => ['nullable', 'boolean'],
            'tags' => ['nullable', 'array'],
            'tags.*' => ['string'],
        ]);

        $ownerId = $validated['owner_id'] ?? $request->user()?->id;

        $project = Project::create(array_merge($validated, [
            'team_id' => $teamId,
            'owner_id' => $ownerId,
            // accountable_id is NOT NULL and defaults to the owner, as the RACI
            // migration itself backfilled it.
            'accountable_id' => $ownerId,
            'start_date' => $validated['start_date'] ?? now()->toDateString(),
        ]));

        return Response::json($project->fresh()->toArray());
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'team_id' => $schema->integer()->nullable()->description('Team to create the project in. Required when you belong to more than one team; use list_teams to discover the options.'),
            'name' => $schema->string()->description('Project name (required)'),
            'description' => $schema->string()->nullable()->description('Project description'),
            'status' => $schema->string()->enum(['active', 'on_hold', 'completed'])->nullable()->description('Initial status (defaults to active)'),
            'start_date' => $schema->string()->nullable()->description('Start date (YYYY-MM-DD). Defaults to today.'),
            'target_end_date' => $schema->string()->nullable()->description('Target end date (YYYY-MM-DD)'),
            'party_id' => $schema->integer()->description('Client/party ID (required, must belong to the same team). Use list_parties to find one.'),
            'owner_id' => $schema->integer()->nullable()->description('Project owner (must belong to the same team). Defaults to you.'),
            'budget_hours' => $schema->number()->nullable()->description('Budget in hours'),
            'budget_cost' => $schema->number()->nullable()->description('Budget in cost'),
            'budget_type' => $schema->string()->enum(['fixed_price', 'time_and_materials', 'monthly_subscription'])->nullable()->description('Budget type'),
            'is_private' => $schema->boolean()->nullable()->description('Whether the project is private'),
            'tags' => $schema->array($schema->string())->nullable()->description('Tags'),
        ];
    }
}

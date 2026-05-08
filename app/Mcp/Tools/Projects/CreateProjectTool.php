<?php

declare(strict_types=1);

namespace App\Mcp\Tools\Projects;

use App\Mcp\Concerns\RequiresWriteAbility;
use App\Mcp\TeamContext;
use App\Models\Project;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\Validation\Rule;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Tool;

#[Description('Create a new project for the team. Returns the created project with its new ID.')]
class CreateProjectTool extends Tool
{
    use RequiresWriteAbility;

    public function handle(Request $request, TeamContext $context): Response
    {
        $this->authorizeWrite($request);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'status' => ['nullable', 'string', Rule::in(['active', 'on_hold', 'completed'])],
            'start_date' => ['nullable', 'date'],
            'target_end_date' => ['nullable', 'date'],
            'party_id' => ['nullable', 'integer', Rule::exists('parties', 'id')->where('team_id', $context->teamId)],
            'budget_hours' => ['nullable', 'numeric', 'min:0'],
            'budget_cost' => ['nullable', 'numeric', 'min:0'],
            'budget_type' => ['nullable', 'string', Rule::in(['fixed_price', 'time_and_materials', 'monthly_subscription'])],
            'is_private' => ['nullable', 'boolean'],
            'tags' => ['nullable', 'array'],
            'tags.*' => ['string'],
        ]);

        $project = Project::create(array_merge($validated, [
            'team_id' => $context->teamId,
        ]));

        return Response::json($project->fresh()->toArray());
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'name' => $schema->string()->description('Project name (required)'),
            'description' => $schema->string()->nullable()->description('Project description'),
            'status' => $schema->string()->enum(['active', 'on_hold', 'completed'])->nullable()->description('Initial status (defaults to active)'),
            'start_date' => $schema->string()->nullable()->description('Start date (YYYY-MM-DD)'),
            'target_end_date' => $schema->string()->nullable()->description('Target end date (YYYY-MM-DD)'),
            'party_id' => $schema->integer()->nullable()->description('Client/party ID'),
            'budget_hours' => $schema->number()->nullable()->description('Budget in hours'),
            'budget_cost' => $schema->number()->nullable()->description('Budget in cost'),
            'budget_type' => $schema->string()->enum(['fixed_price', 'time_and_materials', 'monthly_subscription'])->nullable()->description('Budget type'),
            'is_private' => $schema->boolean()->nullable()->description('Whether the project is private'),
            'tags' => $schema->array($schema->string())->nullable()->description('Tags'),
        ];
    }
}

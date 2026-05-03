<?php

declare(strict_types=1);

namespace App\Mcp\Tools\Projects;

use App\Mcp\TeamContext;
use App\Models\Project;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\Validation\Rule;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Tool;

#[Description('Update an existing project. Only provided fields are updated. Returns the updated project.')]
class UpdateProjectTool extends Tool
{
    public function handle(Request $request, TeamContext $context): Response
    {
        $validated = $request->validate([
            'id' => ['required', 'integer'],
            'name' => ['sometimes', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string'],
            'status' => ['sometimes', 'string', Rule::in(['active', 'on_hold', 'completed', 'archived'])],
            'start_date' => ['sometimes', 'nullable', 'date'],
            'target_end_date' => ['sometimes', 'nullable', 'date'],
            'party_id' => ['sometimes', 'nullable', 'integer'],
            'budget_hours' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'budget_cost' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'budget_type' => ['sometimes', 'nullable', 'string', Rule::in(['fixed_price', 'time_and_materials', 'monthly_subscription'])],
            'is_private' => ['sometimes', 'boolean'],
            'tags' => ['sometimes', 'nullable', 'array'],
            'tags.*' => ['string'],
        ]);

        $project = Project::forTeam($context->teamId)->findOrFail($validated['id']);

        $project->update(collect($validated)->except('id')->toArray());

        return Response::json($project->fresh()->toArray());
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'id' => $schema->integer()->description('The project ID to update (required)'),
            'name' => $schema->string()->nullable()->description('New project name'),
            'description' => $schema->string()->nullable()->description('New description'),
            'status' => $schema->string()->enum(['active', 'on_hold', 'completed', 'archived'])->nullable()->description('New status'),
            'start_date' => $schema->string()->nullable()->description('New start date (YYYY-MM-DD)'),
            'target_end_date' => $schema->string()->nullable()->description('New target end date (YYYY-MM-DD)'),
            'party_id' => $schema->integer()->nullable()->description('New client/party ID'),
            'budget_hours' => $schema->number()->nullable()->description('New budget in hours'),
            'budget_cost' => $schema->number()->nullable()->description('New budget cost'),
            'budget_type' => $schema->string()->enum(['fixed_price', 'time_and_materials', 'monthly_subscription'])->nullable()->description('New budget type'),
            'is_private' => $schema->boolean()->nullable()->description('Private flag'),
            'tags' => $schema->array($schema->string())->nullable()->description('Tags (replaces existing)'),
        ];
    }
}

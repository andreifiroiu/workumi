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

#[Description('List projects for the team. Optionally filter by status or include archived projects. Returns id, name, status, progress, start_date, target_end_date, and party name.')]
class ListProjectsTool extends Tool
{
    public function handle(Request $request, TeamContext $context): Response
    {
        $validated = $request->validate([
            'status' => ['nullable', 'string', Rule::in(['active', 'on_hold', 'completed', 'archived'])],
            'include_archived' => ['nullable', 'boolean'],
        ]);

        $query = Project::forTeam($context->teamId)
            ->with(['party:id,name', 'owner:id,name'])
            ->orderBy('name');

        if (isset($validated['status'])) {
            $query->where('status', $validated['status']);
        } elseif (empty($validated['include_archived'])) {
            $query->notArchived();
        }

        $projects = $query->get([
            'id', 'name', 'status', 'progress', 'start_date',
            'target_end_date', 'party_id', 'owner_id', 'is_private',
        ]);

        return Response::json($projects->toArray());
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'status' => $schema->string()->enum(['active', 'on_hold', 'completed', 'archived'])->nullable()->description('Filter by project status'),
            'include_archived' => $schema->boolean()->nullable()->description('Include archived projects (default: false)'),
        ];
    }
}

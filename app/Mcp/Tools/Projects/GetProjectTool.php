<?php

declare(strict_types=1);

namespace App\Mcp\Tools\Projects;

use App\Mcp\TeamContext;
use App\Models\Project;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Tool;

#[Description('Get full details of a single project, including its work orders list, party, and owner.')]
class GetProjectTool extends Tool
{
    public function handle(Request $request, TeamContext $context): Response
    {
        $validated = $request->validate([
            'id' => ['required', 'integer'],
        ]);

        $project = Project::forTeam($context->teamId)
            ->with([
                'party:id,name,type',
                'owner:id,name',
                'workOrders:id,title,status,priority,due_date,estimated_hours,actual_hours,project_id,assigned_to_id',
                'workOrders.assignedTo:id,name',
            ])
            ->findOrFail($validated['id']);

        return Response::json($project->toArray());
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'id' => $schema->integer()->description('The project ID'),
        ];
    }
}

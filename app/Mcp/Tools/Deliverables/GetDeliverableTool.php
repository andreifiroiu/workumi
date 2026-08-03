<?php

declare(strict_types=1);

namespace App\Mcp\Tools\Deliverables;

use App\Models\Deliverable;
use App\Support\TeamAccess;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Tool;

#[Description('Get full details of a single deliverable by ID in any team you belong to, including its work order and project.')]
class GetDeliverableTool extends Tool
{
    public function handle(Request $request, TeamAccess $access): Response
    {
        $validated = $request->validate([
            'id' => ['required', 'integer'],
        ]);

        $deliverable = Deliverable::forTeams($access->teamIds)
            ->with(['team' => fn ($q) => $q->select('id', 'name')->without(['roles', 'groups']), 'workOrder:id,title,project_id', 'project:id,name'])
            ->findOrFail($validated['id']);

        return Response::json($deliverable->toArray());
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'id' => $schema->integer()->description('Deliverable ID (required)'),
        ];
    }
}

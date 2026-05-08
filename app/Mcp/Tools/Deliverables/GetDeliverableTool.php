<?php

declare(strict_types=1);

namespace App\Mcp\Tools\Deliverables;

use App\Mcp\TeamContext;
use App\Models\Deliverable;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Tool;

#[Description('Get full details of a single deliverable by ID, including its work order and project.')]
class GetDeliverableTool extends Tool
{
    public function handle(Request $request, TeamContext $context): Response
    {
        $validated = $request->validate([
            'id' => ['required', 'integer'],
        ]);

        $deliverable = Deliverable::forTeam($context->teamId)
            ->with(['workOrder:id,title,project_id', 'project:id,name'])
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

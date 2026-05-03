<?php

declare(strict_types=1);

namespace App\Mcp\Tools\WorkOrders;

use App\Mcp\TeamContext;
use App\Models\WorkOrder;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Tool;

#[Description('Get full details of a single work order, including its tasks list, project, and assigned user.')]
class GetWorkOrderTool extends Tool
{
    public function handle(Request $request, TeamContext $context): Response
    {
        $validated = $request->validate([
            'id' => ['required', 'integer'],
        ]);

        $workOrder = WorkOrder::forTeam($context->teamId)
            ->with([
                'project:id,name',
                'assignedTo:id,name',
                'tasks:id,title,status,due_date,estimated_hours,actual_hours,work_order_id,assigned_to_id,is_blocked',
                'tasks.assignedTo:id,name',
            ])
            ->findOrFail($validated['id']);

        return Response::json($workOrder->toArray());
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'id' => $schema->integer()->description('The work order ID'),
        ];
    }
}

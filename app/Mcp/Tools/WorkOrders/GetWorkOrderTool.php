<?php

declare(strict_types=1);

namespace App\Mcp\Tools\WorkOrders;

use App\Models\WorkOrder;
use App\Support\TeamAccess;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Tool;

#[Description('Get full details of a single work order in any team you belong to, including its tasks list, project, and assigned user.')]
class GetWorkOrderTool extends Tool
{
    public function handle(Request $request, TeamAccess $access): Response
    {
        $validated = $request->validate([
            'id' => ['required', 'integer'],
        ]);

        $workOrder = WorkOrder::forTeams($access->teamIds)->inProjectsVisibleTo($access->userId)
            ->with([
                'team' => fn ($q) => $q->select('id', 'name')->without(['roles', 'groups']),
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

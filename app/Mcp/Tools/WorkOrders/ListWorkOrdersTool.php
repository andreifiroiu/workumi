<?php

declare(strict_types=1);

namespace App\Mcp\Tools\WorkOrders;

use App\Enums\WorkOrderStatus;
use App\Mcp\TeamContext;
use App\Models\WorkOrder;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\Validation\Rule;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Tool;

#[Description('List work orders for the team. Filter by project_id, status, or assigned_to_id. Returns id, title, status, priority, due_date, estimated_hours, and project info.')]
class ListWorkOrdersTool extends Tool
{
    public function handle(Request $request, TeamContext $context): Response
    {
        $validated = $request->validate([
            'project_id' => ['nullable', 'integer'],
            'status' => ['nullable', 'string', Rule::in(['draft', 'active', 'in_review', 'approved', 'delivered', 'blocked', 'cancelled', 'revision_requested', 'archived'])],
            'assigned_to_id' => ['nullable', 'integer'],
            'include_archived' => ['nullable', 'boolean'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:200'],
            'offset' => ['nullable', 'integer', 'min:0'],
        ]);

        $query = WorkOrder::forTeam($context->teamId)
            ->with(['project:id,name', 'assignedTo:id,name'])
            ->orderBy('created_at', 'desc');

        if (isset($validated['project_id'])) {
            $query->where('project_id', $validated['project_id']);
        }

        if (isset($validated['status'])) {
            $query->withStatus(WorkOrderStatus::from($validated['status']));
        } elseif (empty($validated['include_archived'])) {
            $query->notArchived();
        }

        if (isset($validated['assigned_to_id'])) {
            $query->assignedTo($validated['assigned_to_id']);
        }

        $limit = $validated['limit'] ?? 50;
        $offset = $validated['offset'] ?? 0;

        $workOrders = $query->offset($offset)->limit($limit)->get([
            'id', 'title', 'status', 'priority', 'due_date',
            'estimated_hours', 'actual_hours', 'project_id', 'assigned_to_id',
        ]);

        return Response::json(['data' => $workOrders->toArray(), 'limit' => $limit, 'offset' => $offset]);
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'project_id' => $schema->integer()->nullable()->description('Filter by project ID'),
            'status' => $schema->string()->enum(['draft', 'active', 'in_review', 'approved', 'delivered', 'blocked', 'cancelled', 'revision_requested', 'archived'])->nullable()->description('Filter by status'),
            'assigned_to_id' => $schema->integer()->nullable()->description('Filter by assigned user ID'),
            'include_archived' => $schema->boolean()->nullable()->description('Include archived work orders (default: false)'),
            'limit' => $schema->integer()->nullable()->description('Max records to return (default 50, max 200)'),
            'offset' => $schema->integer()->nullable()->description('Number of records to skip (default 0)'),
        ];
    }
}

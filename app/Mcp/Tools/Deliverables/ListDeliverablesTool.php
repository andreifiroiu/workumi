<?php

declare(strict_types=1);

namespace App\Mcp\Tools\Deliverables;

use App\Mcp\TeamContext;
use App\Models\Deliverable;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\Validation\Rule;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Tool;

#[Description('List deliverables for the team. Filter by work_order_id, project_id, status, or type. Returns id, title, type, status, version, file_url, work_order_id, and project_id.')]
class ListDeliverablesTool extends Tool
{
    public function handle(Request $request, TeamContext $context): Response
    {
        $validated = $request->validate([
            'work_order_id' => ['nullable', 'integer'],
            'project_id' => ['nullable', 'integer'],
            'status' => ['nullable', 'string', Rule::in(['draft', 'in_review', 'approved', 'delivered'])],
            'type' => ['nullable', 'string', Rule::in(['document', 'design', 'report', 'code', 'other'])],
            'limit' => ['nullable', 'integer', 'min:1', 'max:200'],
            'offset' => ['nullable', 'integer', 'min:0'],
        ]);

        $query = Deliverable::forTeam($context->teamId)
            ->with(['workOrder:id,title', 'project:id,name'])
            ->orderBy('created_at', 'desc');

        if (isset($validated['work_order_id'])) {
            $query->where('work_order_id', $validated['work_order_id']);
        }

        if (isset($validated['project_id'])) {
            $query->where('project_id', $validated['project_id']);
        }

        if (isset($validated['status'])) {
            $query->where('status', $validated['status']);
        }

        if (isset($validated['type'])) {
            $query->where('type', $validated['type']);
        }

        $limit = $validated['limit'] ?? 50;
        $offset = $validated['offset'] ?? 0;

        $deliverables = $query->offset($offset)->limit($limit)->get([
            'id', 'title', 'type', 'status', 'version',
            'file_url', 'work_order_id', 'project_id',
        ]);

        return Response::json(['data' => $deliverables->toArray(), 'limit' => $limit, 'offset' => $offset]);
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'work_order_id' => $schema->integer()->nullable()->description('Filter by work order ID'),
            'project_id' => $schema->integer()->nullable()->description('Filter by project ID'),
            'status' => $schema->string()->enum(['draft', 'in_review', 'approved', 'delivered'])->nullable()->description('Filter by status'),
            'type' => $schema->string()->enum(['document', 'design', 'report', 'code', 'other'])->nullable()->description('Filter by type'),
            'limit' => $schema->integer()->nullable()->description('Max records to return (default 50, max 200)'),
            'offset' => $schema->integer()->nullable()->description('Number of records to skip (default 0)'),
        ];
    }
}

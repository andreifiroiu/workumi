<?php

declare(strict_types=1);

namespace App\Mcp\Tools\WorkOrders;

use App\Mcp\TeamContext;
use App\Models\WorkOrder;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\Validation\Rule;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Tool;

#[Description('Update an existing work order. Only provided fields are updated. Returns the updated work order.')]
class UpdateWorkOrderTool extends Tool
{
    public function handle(Request $request, TeamContext $context): Response
    {
        $validated = $request->validate([
            'id' => ['required', 'integer'],
            'title' => ['sometimes', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string'],
            'status' => ['sometimes', 'string', Rule::in(['draft', 'active', 'in_review', 'approved', 'delivered', 'blocked', 'cancelled', 'revision_requested', 'archived'])],
            'priority' => ['sometimes', 'string', Rule::in(['low', 'medium', 'high', 'urgent'])],
            'due_date' => ['sometimes', 'nullable', 'date'],
            'estimated_hours' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'assigned_to_id' => ['sometimes', 'nullable', 'integer'],
            'acceptance_criteria' => ['sometimes', 'nullable', 'array'],
            'acceptance_criteria.*' => ['string'],
        ]);

        $workOrder = WorkOrder::forTeam($context->teamId)->findOrFail($validated['id']);

        $workOrder->update(collect($validated)->except('id')->toArray());

        return Response::json($workOrder->fresh()->load(['project:id,name', 'assignedTo:id,name'])->toArray());
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'id' => $schema->integer()->description('The work order ID to update (required)'),
            'title' => $schema->string()->nullable()->description('New title'),
            'description' => $schema->string()->nullable()->description('New description'),
            'status' => $schema->string()->enum(['draft', 'active', 'in_review', 'approved', 'delivered', 'blocked', 'cancelled', 'revision_requested', 'archived'])->nullable()->description('New status'),
            'priority' => $schema->string()->enum(['low', 'medium', 'high', 'urgent'])->nullable()->description('New priority'),
            'due_date' => $schema->string()->nullable()->description('New due date (YYYY-MM-DD)'),
            'estimated_hours' => $schema->number()->nullable()->description('New estimated hours'),
            'assigned_to_id' => $schema->integer()->nullable()->description('New assigned user ID'),
            'acceptance_criteria' => $schema->array($schema->string())->nullable()->description('Acceptance criteria (replaces existing)'),
        ];
    }
}

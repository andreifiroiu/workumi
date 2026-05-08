<?php

declare(strict_types=1);

namespace App\Mcp\Tools\Deliverables;

use App\Mcp\Concerns\RequiresWriteAbility;
use App\Mcp\TeamContext;
use App\Models\Deliverable;
use App\Models\WorkOrder;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\Validation\Rule;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Tool;

#[Description('Create a new deliverable within a work order. The project_id is resolved automatically from the work order. Returns the created deliverable with its new ID.')]
class CreateDeliverableTool extends Tool
{
    use RequiresWriteAbility;

    public function handle(Request $request, TeamContext $context): Response
    {
        $this->authorizeWrite($request);

        $validated = $request->validate([
            'work_order_id' => ['required', 'integer'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'type' => ['nullable', 'string', Rule::in(['document', 'design', 'report', 'code', 'other'])],
            'status' => ['nullable', 'string', Rule::in(['draft', 'in_review', 'approved', 'delivered'])],
            'version' => ['nullable', 'string', 'max:50'],
            'file_url' => ['nullable', 'url'],
            'acceptance_criteria' => ['nullable', 'array'],
            'acceptance_criteria.*' => ['string'],
        ]);

        $workOrder = WorkOrder::forTeam($context->teamId)->findOrFail($validated['work_order_id']);

        $deliverable = Deliverable::create(array_merge($validated, [
            'team_id' => $context->teamId,
            'project_id' => $workOrder->project_id,
        ]));

        return Response::json(
            $deliverable->fresh()->load(['workOrder:id,title', 'project:id,name'])->toArray()
        );
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'work_order_id' => $schema->integer()->description('Work order ID to create the deliverable in (required)'),
            'title' => $schema->string()->description('Deliverable title (required)'),
            'description' => $schema->string()->nullable()->description('Description'),
            'type' => $schema->string()->enum(['document', 'design', 'report', 'code', 'other'])->nullable()->description('Deliverable type'),
            'status' => $schema->string()->enum(['draft', 'in_review', 'approved', 'delivered'])->nullable()->description('Initial status (defaults to draft)'),
            'version' => $schema->string()->nullable()->description('Version string (e.g. v1.0)'),
            'file_url' => $schema->string()->nullable()->description('URL to the deliverable file'),
            'acceptance_criteria' => $schema->array($schema->string())->nullable()->description('List of acceptance criteria'),
        ];
    }
}

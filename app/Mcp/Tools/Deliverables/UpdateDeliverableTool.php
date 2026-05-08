<?php

declare(strict_types=1);

namespace App\Mcp\Tools\Deliverables;

use App\Mcp\Concerns\RequiresWriteAbility;
use App\Mcp\TeamContext;
use App\Models\Deliverable;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\Validation\Rule;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Tool;

#[Description('Update an existing deliverable. Only the fields you provide will be changed. Returns the updated deliverable.')]
class UpdateDeliverableTool extends Tool
{
    use RequiresWriteAbility;

    public function handle(Request $request, TeamContext $context): Response
    {
        $this->authorizeWrite($request);

        $validated = $request->validate([
            'id' => ['required', 'integer'],
            'title' => ['sometimes', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string'],
            'type' => ['sometimes', 'string', Rule::in(['document', 'design', 'report', 'code', 'other'])],
            'status' => ['sometimes', 'string', Rule::in(['draft', 'in_review', 'approved', 'delivered'])],
            'version' => ['sometimes', 'nullable', 'string', 'max:50'],
            'file_url' => ['sometimes', 'nullable', 'url'],
            'acceptance_criteria' => ['sometimes', 'nullable', 'array'],
            'acceptance_criteria.*' => ['string'],
        ]);

        $deliverable = Deliverable::forTeam($context->teamId)->findOrFail($validated['id']);

        $deliverable->update(collect($validated)->except('id')->toArray());

        return Response::json(
            $deliverable->fresh()->load(['workOrder:id,title', 'project:id,name'])->toArray()
        );
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'id' => $schema->integer()->description('Deliverable ID to update (required)'),
            'title' => $schema->string()->nullable()->description('New title'),
            'description' => $schema->string()->nullable()->description('New description'),
            'type' => $schema->string()->enum(['document', 'design', 'report', 'code', 'other'])->nullable()->description('New type'),
            'status' => $schema->string()->enum(['draft', 'in_review', 'approved', 'delivered'])->nullable()->description('New status'),
            'version' => $schema->string()->nullable()->description('New version string'),
            'file_url' => $schema->string()->nullable()->description('New file URL'),
            'acceptance_criteria' => $schema->array($schema->string())->nullable()->description('Replace acceptance criteria list'),
        ];
    }
}

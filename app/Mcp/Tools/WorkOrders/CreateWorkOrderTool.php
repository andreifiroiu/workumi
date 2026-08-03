<?php

declare(strict_types=1);

namespace App\Mcp\Tools\WorkOrders;

use App\Mcp\Concerns\RequiresWriteAbility;
use App\Models\Project;
use App\Models\WorkOrder;
use App\Support\TeamAccess;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\Validation\Rule;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Tool;

#[Description('Create a new work order within a project. The team is taken from the project. Returns the created work order with its new ID.')]
class CreateWorkOrderTool extends Tool
{
    use RequiresWriteAbility;

    public function handle(Request $request, TeamAccess $access): Response
    {
        $this->authorizeWrite($request);

        $identified = $request->validate([
            'project_id' => ['required', 'integer'],
        ]);

        $project = Project::forTeams($access->teamIds)->visibleTo($access->userId)->findOrFail($identified['project_id']);

        $validated = $request->validate([
            'project_id' => ['required', 'integer'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'status' => ['nullable', 'string', Rule::in(['draft', 'active', 'in_review', 'approved', 'delivered', 'blocked', 'cancelled', 'revision_requested'])],
            'priority' => ['nullable', 'string', Rule::in(['low', 'medium', 'high', 'urgent'])],
            'due_date' => ['nullable', 'date'],
            'estimated_hours' => ['nullable', 'numeric', 'min:0'],
            'assigned_to_id' => ['nullable', 'integer', $this->teamMemberRule($project->team_id)],
            'acceptance_criteria' => ['nullable', 'array'],
            'acceptance_criteria.*' => ['string'],
        ]);

        $userId = $request->user()->id;

        $workOrder = WorkOrder::create(array_merge($validated, [
            'team_id' => $project->team_id,
            'created_by_id' => $userId,
            'accountable_id' => $userId,
        ]));

        return Response::json($workOrder->fresh()->load(['team' => fn ($q) => $q->select('id', 'name')->without(['roles', 'groups']), 'project:id,name', 'assignedTo:id,name'])->toArray());
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'project_id' => $schema->integer()->description('The project ID to create the work order in (required). The work order inherits the project\'s team.'),
            'title' => $schema->string()->description('Work order title (required)'),
            'description' => $schema->string()->nullable()->description('Work order description'),
            'status' => $schema->string()->enum(['draft', 'active', 'in_review', 'approved', 'delivered', 'blocked', 'cancelled', 'revision_requested'])->nullable()->description('Initial status (defaults to draft)'),
            'priority' => $schema->string()->enum(['low', 'medium', 'high', 'urgent'])->nullable()->description('Priority level'),
            'due_date' => $schema->string()->nullable()->description('Due date (YYYY-MM-DD)'),
            'estimated_hours' => $schema->number()->nullable()->description('Estimated hours'),
            'assigned_to_id' => $schema->integer()->nullable()->description('User ID to assign to (must belong to the project\'s team)'),
            'acceptance_criteria' => $schema->array($schema->string())->nullable()->description('List of acceptance criteria'),
        ];
    }
}

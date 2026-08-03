<?php

declare(strict_types=1);

namespace App\Mcp\Tools\Tasks;

use App\Mcp\Concerns\RequiresWriteAbility;
use App\Models\Task;
use App\Models\WorkOrder;
use App\Support\TeamAccess;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\Validation\Rule;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Tool;

#[Description('Create a new task within a work order. The team and project_id are resolved automatically from the work order. Returns the created task with its new ID.')]
class CreateTaskTool extends Tool
{
    use RequiresWriteAbility;

    public function handle(Request $request, TeamAccess $access): Response
    {
        $this->authorizeWrite($request);

        $identified = $request->validate([
            'work_order_id' => ['required', 'integer'],
        ]);

        $workOrder = WorkOrder::forTeams($access->teamIds)->visibleTo($access->userId)->findOrFail($identified['work_order_id']);

        $validated = $request->validate([
            'work_order_id' => ['required', 'integer'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'status' => ['nullable', 'string', Rule::in(['todo', 'in_progress', 'in_review', 'approved', 'done', 'blocked', 'cancelled', 'revision_requested'])],
            'due_date' => ['nullable', 'date'],
            'estimated_hours' => ['nullable', 'numeric', 'min:0'],
            'assigned_to_id' => ['nullable', 'integer', $this->teamMemberRule($workOrder->team_id)],
            'checklist_items' => ['nullable', 'array'],
            'checklist_items.*.text' => ['required_with:checklist_items', 'string'],
        ]);

        $task = Task::create(array_merge($validated, [
            'team_id' => $workOrder->team_id,
            'project_id' => $workOrder->project_id,
        ]));

        return Response::json($task->fresh()->load(['team' => fn ($q) => $q->select('id', 'name')->without(['roles', 'groups']), 'workOrder:id,title', 'assignedTo:id,name'])->toArray());
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'work_order_id' => $schema->integer()->description('The work order ID to create the task in (required). The task inherits the work order\'s team and project.'),
            'title' => $schema->string()->description('Task title (required)'),
            'description' => $schema->string()->nullable()->description('Task description'),
            'status' => $schema->string()->enum(['todo', 'in_progress', 'in_review', 'approved', 'done', 'blocked', 'cancelled', 'revision_requested'])->nullable()->description('Initial status (defaults to todo)'),
            'due_date' => $schema->string()->nullable()->description('Due date (YYYY-MM-DD)'),
            'estimated_hours' => $schema->number()->nullable()->description('Estimated hours'),
            'assigned_to_id' => $schema->integer()->nullable()->description('User ID to assign to (must belong to the work order\'s team)'),
            'checklist_items' => $schema->array(
                $schema->object(['text' => $schema->string()->description('Checklist item text')])
            )->nullable()->description('Initial checklist items'),
        ];
    }
}

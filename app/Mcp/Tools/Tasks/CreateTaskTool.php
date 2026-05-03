<?php

declare(strict_types=1);

namespace App\Mcp\Tools\Tasks;

use App\Mcp\TeamContext;
use App\Models\Task;
use App\Models\WorkOrder;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\Validation\Rule;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Tool;

#[Description('Create a new task within a work order. The project_id is resolved automatically from the work order. Returns the created task with its new ID.')]
class CreateTaskTool extends Tool
{
    public function handle(Request $request, TeamContext $context): Response
    {
        $validated = $request->validate([
            'work_order_id' => ['required', 'integer'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'status' => ['nullable', 'string', Rule::in(['todo', 'in_progress', 'in_review', 'approved', 'done', 'blocked', 'cancelled', 'revision_requested'])],
            'due_date' => ['nullable', 'date'],
            'estimated_hours' => ['nullable', 'numeric', 'min:0'],
            'assigned_to_id' => ['nullable', 'integer'],
            'checklist_items' => ['nullable', 'array'],
            'checklist_items.*.text' => ['required_with:checklist_items', 'string'],
        ]);

        $workOrder = WorkOrder::forTeam($context->teamId)->findOrFail($validated['work_order_id']);

        $task = Task::create(array_merge($validated, [
            'team_id' => $context->teamId,
            'project_id' => $workOrder->project_id,
        ]));

        return Response::json($task->fresh()->load(['workOrder:id,title', 'assignedTo:id,name'])->toArray());
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'work_order_id' => $schema->integer()->description('The work order ID to create the task in (required)'),
            'title' => $schema->string()->description('Task title (required)'),
            'description' => $schema->string()->nullable()->description('Task description'),
            'status' => $schema->string()->enum(['todo', 'in_progress', 'in_review', 'approved', 'done', 'blocked', 'cancelled', 'revision_requested'])->nullable()->description('Initial status (defaults to todo)'),
            'due_date' => $schema->string()->nullable()->description('Due date (YYYY-MM-DD)'),
            'estimated_hours' => $schema->number()->nullable()->description('Estimated hours'),
            'assigned_to_id' => $schema->integer()->nullable()->description('User ID to assign to'),
            'checklist_items' => $schema->array(
                $schema->object(['text' => $schema->string()->description('Checklist item text')])
            )->nullable()->description('Initial checklist items'),
        ];
    }
}

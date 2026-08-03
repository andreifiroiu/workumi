<?php

declare(strict_types=1);

namespace App\Mcp\Tools\Tasks;

use App\Mcp\Concerns\RequiresWriteAbility;
use App\Models\Task;
use App\Support\TeamAccess;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\Validation\Rule;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Tool;

#[Description('Update an existing task in any team you belong to. Only provided fields are updated. Checklist items replace the full list when provided. Returns the updated task.')]
class UpdateTaskTool extends Tool
{
    use RequiresWriteAbility;

    public function handle(Request $request, TeamAccess $access): Response
    {
        $this->authorizeWrite($request);

        $identified = $request->validate([
            'id' => ['required', 'integer'],
        ]);

        $task = Task::forTeams($access->teamIds)->findOrFail($identified['id']);

        $validated = $request->validate([
            'id' => ['required', 'integer'],
            'title' => ['sometimes', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string'],
            'status' => ['sometimes', 'string', Rule::in(['todo', 'in_progress', 'in_review', 'approved', 'done', 'blocked', 'cancelled', 'revision_requested', 'archived'])],
            'due_date' => ['sometimes', 'nullable', 'date'],
            'estimated_hours' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'assigned_to_id' => ['sometimes', 'nullable', 'integer', $this->teamMemberRule($task->team_id)],
            'is_blocked' => ['sometimes', 'boolean'],
            'blocker_reason' => ['sometimes', 'nullable', 'string', Rule::in(['waiting_on_external', 'missing_information', 'technical_issue', 'waiting_on_approval'])],
            'blocker_details' => ['sometimes', 'nullable', 'string'],
            'checklist_items' => ['sometimes', 'nullable', 'array'],
            'checklist_items.*.text' => ['required_with:checklist_items', 'string'],
            'checklist_items.*.completed' => ['sometimes', 'boolean'],
        ]);

        $task->update(collect($validated)->except('id')->toArray());

        $freshTask = $task->fresh()->load(['team' => fn ($q) => $q->select('id', 'name')->without(['roles', 'groups']), 'workOrder:id,title', 'assignedTo:id,name']);
        $data = $freshTask->toArray();
        $data['checklist_progress'] = $freshTask->checklist_progress;

        return Response::json($data);
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'id' => $schema->integer()->description('The task ID to update (required)'),
            'title' => $schema->string()->nullable()->description('New title'),
            'description' => $schema->string()->nullable()->description('New description'),
            'status' => $schema->string()->enum(['todo', 'in_progress', 'in_review', 'approved', 'done', 'blocked', 'cancelled', 'revision_requested', 'archived'])->nullable()->description('New status'),
            'due_date' => $schema->string()->nullable()->description('New due date (YYYY-MM-DD)'),
            'estimated_hours' => $schema->number()->nullable()->description('New estimated hours'),
            'assigned_to_id' => $schema->integer()->nullable()->description('New assigned user ID (must belong to the task\'s team)'),
            'is_blocked' => $schema->boolean()->nullable()->description('Whether the task is blocked'),
            'blocker_reason' => $schema->string()->enum(['waiting_on_external', 'missing_information', 'technical_issue', 'waiting_on_approval'])->nullable()->description('Reason for blocker'),
            'blocker_details' => $schema->string()->nullable()->description('Blocker details'),
            'checklist_items' => $schema->array(
                $schema->object([
                    'text' => $schema->string()->description('Item text'),
                    'completed' => $schema->boolean()->nullable()->description('Whether completed'),
                ])
            )->nullable()->description('Checklist items (replaces full list)'),
        ];
    }
}

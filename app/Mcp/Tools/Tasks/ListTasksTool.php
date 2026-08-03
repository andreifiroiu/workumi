<?php

declare(strict_types=1);

namespace App\Mcp\Tools\Tasks;

use App\Enums\TaskStatus;
use App\Models\Task;
use App\Support\TeamAccess;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\Validation\Rule;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Tool;

#[Description('List tasks across every team you belong to, or pass team_id to narrow to one. Filter by work_order_id, project_id, status, or assigned_to_id. Returns id, title, status, due_date, estimated_hours, team, and assignee.')]
class ListTasksTool extends Tool
{
    public function handle(Request $request, TeamAccess $access): Response
    {
        $validated = $request->validate([
            'team_id' => ['nullable', 'integer'],
            'work_order_id' => ['nullable', 'integer'],
            'project_id' => ['nullable', 'integer'],
            'status' => ['nullable', 'string', Rule::in(['todo', 'in_progress', 'in_review', 'approved', 'done', 'blocked', 'cancelled', 'revision_requested', 'archived'])],
            'assigned_to_id' => ['nullable', 'integer'],
            'include_archived' => ['nullable', 'boolean'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:200'],
            'offset' => ['nullable', 'integer', 'min:0'],
        ]);

        $query = Task::forTeams($access->filter(isset($validated['team_id']) ? (int) $validated['team_id'] : null))
            ->inProjectsVisibleTo($access->userId)
            ->with(['team' => fn ($q) => $q->select('id', 'name')->without(['roles', 'groups']), 'assignedTo:id,name', 'workOrder:id,title,project_id'])
            ->ordered()
            ->orderBy('id');

        if (isset($validated['work_order_id'])) {
            $query->where('work_order_id', $validated['work_order_id']);
        }

        if (isset($validated['project_id'])) {
            $query->where('project_id', $validated['project_id']);
        }

        if (isset($validated['status'])) {
            $query->withStatus(TaskStatus::from($validated['status']));
        } elseif (empty($validated['include_archived'])) {
            $query->notArchived();
        }

        if (isset($validated['assigned_to_id'])) {
            $query->assignedTo($validated['assigned_to_id']);
        }

        $limit = $validated['limit'] ?? 50;
        $offset = $validated['offset'] ?? 0;

        $tasks = $query->offset($offset)->limit($limit)->get([
            'id', 'team_id', 'title', 'status', 'due_date', 'estimated_hours',
            'actual_hours', 'work_order_id', 'project_id', 'assigned_to_id',
            'is_blocked', 'position_in_work_order',
        ]);

        return Response::json(['data' => $tasks->toArray(), 'limit' => $limit, 'offset' => $offset]);
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'team_id' => $schema->integer()->nullable()->description('Limit to one team (default: all teams you belong to)'),
            'work_order_id' => $schema->integer()->nullable()->description('Filter by work order ID'),
            'project_id' => $schema->integer()->nullable()->description('Filter by project ID'),
            'status' => $schema->string()->enum(['todo', 'in_progress', 'in_review', 'approved', 'done', 'blocked', 'cancelled', 'revision_requested', 'archived'])->nullable()->description('Filter by status'),
            'assigned_to_id' => $schema->integer()->nullable()->description('Filter by assigned user ID'),
            'include_archived' => $schema->boolean()->nullable()->description('Include archived tasks (default: false)'),
            'limit' => $schema->integer()->nullable()->description('Max records to return (default 50, max 200)'),
            'offset' => $schema->integer()->nullable()->description('Number of records to skip (default 0)'),
        ];
    }
}

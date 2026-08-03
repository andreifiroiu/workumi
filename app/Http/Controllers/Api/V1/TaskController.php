<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Enums\TaskStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StoreTaskRequest;
use App\Http\Requests\Api\V1\UpdateTaskRequest;
use App\Http\Resources\Api\V1\TaskResource;
use App\Models\Task;
use App\Support\TeamAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class TaskController extends Controller
{
    /**
     * Tasks across every team this token can reach, or one team via team_id.
     */
    public function index(Request $request, TeamAccess $access): AnonymousResourceCollection
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
            $query->assignedTo((int) $validated['assigned_to_id']);
        }

        $limit = (int) ($validated['limit'] ?? 50);
        $offset = (int) ($validated['offset'] ?? 0);

        return TaskResource::collection($query->offset($offset)->limit($limit)->get())
            ->additional(['meta' => ['limit' => $limit, 'offset' => $offset]]);
    }

    public function show(TeamAccess $access, int $task): TaskResource
    {
        return new TaskResource(
            Task::forTeams($access->teamIds)->inProjectsVisibleTo($access->userId)
                ->with([
                    'team' => fn ($q) => $q->select('id', 'name')->without(['roles', 'groups']),
                    'workOrder:id,title,project_id',
                    'assignedTo:id,name',
                    'reviewer:id,name',
                ])
                ->findOrFail($task)
        );
    }

    public function store(StoreTaskRequest $request): JsonResponse
    {
        $workOrder = $request->workOrder();

        $task = Task::create(array_merge($request->validated(), [
            'team_id' => $workOrder->team_id,
            'project_id' => $workOrder->project_id,
        ]));

        return (new TaskResource($task->fresh()->load(['team' => fn ($q) => $q->select('id', 'name')->without(['roles', 'groups']), 'workOrder:id,title', 'assignedTo:id,name'])))
            ->response()
            ->setStatusCode(201);
    }

    public function update(UpdateTaskRequest $request): TaskResource
    {
        $task = $request->task();

        $task->update($request->validated());

        return new TaskResource(
            $task->fresh()->load(['team' => fn ($q) => $q->select('id', 'name')->without(['roles', 'groups']), 'workOrder:id,title', 'assignedTo:id,name'])
        );
    }
}

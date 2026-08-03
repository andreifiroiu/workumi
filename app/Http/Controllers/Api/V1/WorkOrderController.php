<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Enums\WorkOrderStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StoreWorkOrderRequest;
use App\Http\Requests\Api\V1\UpdateWorkOrderRequest;
use App\Http\Resources\Api\V1\WorkOrderResource;
use App\Models\WorkOrder;
use App\Support\TeamAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class WorkOrderController extends Controller
{
    /**
     * Work orders across every team this token can reach, or one team via team_id.
     */
    public function index(Request $request, TeamAccess $access): AnonymousResourceCollection
    {
        $validated = $request->validate([
            'team_id' => ['nullable', 'integer'],
            'project_id' => ['nullable', 'integer'],
            'status' => ['nullable', 'string', Rule::in(['draft', 'active', 'in_review', 'approved', 'delivered', 'blocked', 'cancelled', 'revision_requested', 'archived'])],
            'assigned_to_id' => ['nullable', 'integer'],
            'include_archived' => ['nullable', 'boolean'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:200'],
            'offset' => ['nullable', 'integer', 'min:0'],
        ]);

        $query = WorkOrder::forTeams($access->filter(isset($validated['team_id']) ? (int) $validated['team_id'] : null))->visibleTo($access->userId)
            ->visibleTo($access->userId)
            ->with(['team' => fn ($q) => $q->select('id', 'name')->without(['roles', 'groups']), 'project:id,name', 'assignedTo:id,name'])
            ->orderBy('created_at', 'desc');

        if (isset($validated['project_id'])) {
            $query->where('project_id', $validated['project_id']);
        }

        if (isset($validated['status'])) {
            $query->withStatus(WorkOrderStatus::from($validated['status']));
        } elseif (empty($validated['include_archived'])) {
            $query->notArchived();
        }

        if (isset($validated['assigned_to_id'])) {
            $query->assignedTo((int) $validated['assigned_to_id']);
        }

        $limit = (int) ($validated['limit'] ?? 50);
        $offset = (int) ($validated['offset'] ?? 0);

        return WorkOrderResource::collection($query->offset($offset)->limit($limit)->get())
            ->additional(['meta' => ['limit' => $limit, 'offset' => $offset]]);
    }

    public function show(TeamAccess $access, int $workOrder): WorkOrderResource
    {
        return new WorkOrderResource(
            WorkOrder::forTeams($access->teamIds)->visibleTo($access->userId)
                ->with([
                    'team' => fn ($q) => $q->select('id', 'name')->without(['roles', 'groups']),
                    'project:id,name',
                    'assignedTo:id,name',
                    'tasks',
                    'tasks.assignedTo:id,name',
                ])
                ->findOrFail($workOrder)
        );
    }

    public function store(StoreWorkOrderRequest $request): JsonResponse
    {
        $project = $request->project();
        $userId = $request->user()->id;

        $workOrder = WorkOrder::create(array_merge($request->validated(), [
            'team_id' => $project->team_id,
            'created_by_id' => $userId,
            'accountable_id' => $userId,
        ]));

        return (new WorkOrderResource($workOrder->fresh()->load(['team' => fn ($q) => $q->select('id', 'name')->without(['roles', 'groups']), 'project:id,name', 'assignedTo:id,name'])))
            ->response()
            ->setStatusCode(201);
    }

    public function update(UpdateWorkOrderRequest $request): WorkOrderResource
    {
        $workOrder = $request->workOrder();

        $workOrder->update($request->validated());

        return new WorkOrderResource(
            $workOrder->fresh()->load(['team' => fn ($q) => $q->select('id', 'name')->without(['roles', 'groups']), 'project:id,name', 'assignedTo:id,name'])
        );
    }
}

<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StoreDeliverableRequest;
use App\Http\Requests\Api\V1\UpdateDeliverableRequest;
use App\Http\Resources\Api\V1\DeliverableResource;
use App\Models\Deliverable;
use App\Support\TeamAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class DeliverableController extends Controller
{
    /**
     * Deliverables across every team this token can reach, or one team via team_id.
     */
    public function index(Request $request, TeamAccess $access): AnonymousResourceCollection
    {
        $validated = $request->validate([
            'team_id' => ['nullable', 'integer'],
            'work_order_id' => ['nullable', 'integer'],
            'project_id' => ['nullable', 'integer'],
            'status' => ['nullable', 'string', Rule::in(['draft', 'in_review', 'approved', 'delivered'])],
            'type' => ['nullable', 'string', Rule::in(['document', 'design', 'report', 'code', 'other'])],
            'limit' => ['nullable', 'integer', 'min:1', 'max:200'],
            'offset' => ['nullable', 'integer', 'min:0'],
        ]);

        $query = Deliverable::forTeams($access->filter(isset($validated['team_id']) ? (int) $validated['team_id'] : null))
            ->inProjectsVisibleTo($access->userId)
            ->with(['team' => fn ($q) => $q->select('id', 'name')->without(['roles', 'groups']), 'workOrder:id,title', 'project:id,name'])
            ->orderBy('created_at', 'desc');

        foreach (['work_order_id', 'project_id', 'status', 'type'] as $filter) {
            if (isset($validated[$filter])) {
                $query->where($filter, $validated[$filter]);
            }
        }

        $limit = (int) ($validated['limit'] ?? 50);
        $offset = (int) ($validated['offset'] ?? 0);

        return DeliverableResource::collection($query->offset($offset)->limit($limit)->get())
            ->additional(['meta' => ['limit' => $limit, 'offset' => $offset]]);
    }

    public function show(TeamAccess $access, int $deliverable): DeliverableResource
    {
        return new DeliverableResource(
            Deliverable::forTeams($access->teamIds)->inProjectsVisibleTo($access->userId)
                ->with(['team' => fn ($q) => $q->select('id', 'name')->without(['roles', 'groups']), 'workOrder:id,title,project_id', 'project:id,name'])
                ->findOrFail($deliverable)
        );
    }

    public function store(StoreDeliverableRequest $request): JsonResponse
    {
        $workOrder = $request->workOrder();

        $deliverable = Deliverable::create(array_merge($request->validated(), [
            'team_id' => $workOrder->team_id,
            'project_id' => $workOrder->project_id,
        ]));

        return (new DeliverableResource($deliverable->fresh()->load(['team' => fn ($q) => $q->select('id', 'name')->without(['roles', 'groups']), 'workOrder:id,title', 'project:id,name'])))
            ->response()
            ->setStatusCode(201);
    }

    public function update(UpdateDeliverableRequest $request): DeliverableResource
    {
        $deliverable = $request->deliverable();

        $deliverable->update($request->validated());

        return new DeliverableResource(
            $deliverable->fresh()->load(['team' => fn ($q) => $q->select('id', 'name')->without(['roles', 'groups']), 'workOrder:id,title', 'project:id,name'])
        );
    }
}

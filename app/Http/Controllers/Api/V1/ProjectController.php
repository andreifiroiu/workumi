<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StoreProjectRequest;
use App\Http\Requests\Api\V1\UpdateProjectRequest;
use App\Http\Resources\Api\V1\ProjectResource;
use App\Models\Project;
use App\Support\TeamAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class ProjectController extends Controller
{
    /**
     * Projects across every team this token can reach, or one team via team_id.
     */
    public function index(Request $request, TeamAccess $access): AnonymousResourceCollection
    {
        $validated = $request->validate([
            'team_id' => ['nullable', 'integer'],
            'status' => ['nullable', 'string', Rule::in(['active', 'on_hold', 'completed', 'archived'])],
            'include_archived' => ['nullable', 'boolean'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:200'],
            'offset' => ['nullable', 'integer', 'min:0'],
        ]);

        $query = Project::forTeams($access->filter(isset($validated['team_id']) ? (int) $validated['team_id'] : null))
            ->with(['team' => fn ($q) => $q->select('id', 'name')->without(['roles', 'groups']), 'party:id,name', 'owner:id,name'])
            ->orderBy('name');

        if (isset($validated['status'])) {
            $query->where('status', $validated['status']);
        } elseif (empty($validated['include_archived'])) {
            $query->notArchived();
        }

        $limit = (int) ($validated['limit'] ?? 50);
        $offset = (int) ($validated['offset'] ?? 0);

        $projects = $query->offset($offset)->limit($limit)->get();

        return ProjectResource::collection($projects)
            ->additional(['meta' => ['limit' => $limit, 'offset' => $offset]]);
    }

    public function show(TeamAccess $access, int $project): ProjectResource
    {
        return new ProjectResource(
            Project::forTeams($access->teamIds)
                ->with([
                    'team' => fn ($q) => $q->select('id', 'name')->without(['roles', 'groups']),
                    'party:id,name',
                    'owner:id,name',
                    'workOrders',
                    'workOrders.assignedTo:id,name',
                ])
                ->findOrFail($project)
        );
    }

    public function store(StoreProjectRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $ownerId = $validated['owner_id'] ?? $request->user()->id;

        $project = Project::create(array_merge(
            collect($validated)->except('team_id')->all(),
            [
                'team_id' => $request->teamId(),
                'owner_id' => $ownerId,
                // accountable_id is NOT NULL and defaults to the owner, as the
                // RACI migration itself backfilled it.
                'accountable_id' => $ownerId,
                'start_date' => $validated['start_date'] ?? now()->toDateString(),
            ],
        ));

        return (new ProjectResource($project->fresh()->load(['team' => fn ($q) => $q->select('id', 'name')->without(['roles', 'groups'])])))
            ->response()
            ->setStatusCode(201);
    }

    public function update(UpdateProjectRequest $request): ProjectResource
    {
        $project = $request->project();

        $project->update($request->validated());

        return new ProjectResource($project->fresh()->load(['team' => fn ($q) => $q->select('id', 'name')->without(['roles', 'groups'])]));
    }
}

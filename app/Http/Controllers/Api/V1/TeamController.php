<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\Api\V1\TeamResource;
use App\Models\Team;
use App\Models\User;
use App\Support\TeamAccess;
use Illuminate\Http\JsonResponse;

class TeamController extends Controller
{
    /**
     * Every team this token can reach.
     */
    public function index(TeamAccess $access): JsonResponse
    {
        $teams = Team::query()
            ->with('users')
            ->whereIn('id', $access->teamIds)
            ->orderBy('name')
            ->get();

        return TeamResource::collection($teams)
            ->additional(['meta' => ['default_team_id' => $access->defaultTeamId]])
            ->response();
    }

    public function show(TeamAccess $access, int $team): TeamResource
    {
        $access->assert($team);

        return new TeamResource(Team::with('users')->findOrFail($team));
    }

    /**
     * Team members, including the owner — who is not in the team_user pivot,
     * so `role` is derived rather than read from a column.
     */
    public function members(TeamAccess $access, int $team): JsonResponse
    {
        $access->assert($team);

        $model = Team::with(['users', 'owner'])->findOrFail($team);

        $members = $model->allUsers()->map(fn (User $user): array => [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->id === $model->user_id
                ? 'owner'
                : ($user->membership?->role?->code ?? 'member'),
        ]);

        return response()->json(['data' => $members->values()->all()]);
    }
}

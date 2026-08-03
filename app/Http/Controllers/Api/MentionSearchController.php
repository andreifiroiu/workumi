<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use App\Models\WorkOrder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MentionSearchController extends Controller
{
    private const RESULTS_LIMIT = 10;

    public function search(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'q' => 'required|string|min:1|max:100',
            'type' => 'sometimes|string|in:user,work_item,all',
        ]);

        $query = $validated['q'];
        $type = $validated['type'] ?? 'all';

        $user = $request->user();
        $team = $user->currentTeam;

        $results = [
            'users' => [],
            'workItems' => [],
        ];

        // Search users
        if ($type === 'user' || $type === 'all') {
            $results['users'] = $this->searchUsers($query, $team->id);
        }

        // Search work items (projects, work orders, tasks)
        if ($type === 'work_item' || $type === 'all') {
            $results['workItems'] = $this->searchWorkItems($query, $team->id, $user->id);
        }

        return response()->json($results);
    }

    /**
     * Search users by name.
     *
     * @return array<int, array<string, mixed>>
     */
    private function searchUsers(string $query, int $teamId): array
    {
        // Get team users including the owner
        $users = User::where('name', 'LIKE', "%{$query}%")
            ->where(function ($q) use ($teamId) {
                // User is the team owner
                $q->whereHas('teams', function ($teamQuery) use ($teamId) {
                    $teamQuery->where('teams.id', $teamId)
                        ->where('teams.user_id', DB::raw('users.id'));
                })
                // Or user is a team member
                    ->orWhereHas('teams', function ($teamQuery) use ($teamId) {
                        $teamQuery->where('teams.id', $teamId);
                    });
            })
            ->limit(self::RESULTS_LIMIT)
            ->get();

        return $users->map(fn (User $user) => [
            'id' => (string) $user->id,
            'type' => 'user',
            'name' => $user->name,
            'mention' => '@'.$user->name,
        ])->all();
    }

    /**
     * Search work items (projects, work orders, tasks).
     *
     * @return array<int, array<string, mixed>>
     */
    private function searchWorkItems(string $query, int $teamId, int $userId): array
    {
        $workItems = [];
        $perTypeLimit = (int) ceil(self::RESULTS_LIMIT / 3);

        // Search projects
        $projects = Project::forTeam($teamId)
            ->visibleTo($userId)
            ->where('name', 'LIKE', "%{$query}%")
            ->limit($perTypeLimit)
            ->get();

        foreach ($projects as $project) {
            $workItems[] = [
                'id' => (string) $project->id,
                'type' => 'project',
                'name' => $project->name,
                'mention' => '@P-'.$project->id,
            ];
        }

        // Search work orders (uses 'title' field, not 'name')
        $workOrders = WorkOrder::forTeam($teamId)
            ->visibleTo($userId)
            ->where('title', 'LIKE', "%{$query}%")
            ->limit($perTypeLimit)
            ->get();

        foreach ($workOrders as $workOrder) {
            $workItems[] = [
                'id' => (string) $workOrder->id,
                'type' => 'work_order',
                'name' => $workOrder->title,
                'mention' => '@WO-'.$workOrder->id,
            ];
        }

        // Search tasks
        $tasks = Task::forTeam($teamId)
            ->visibleTo($userId)
            ->where('title', 'LIKE', "%{$query}%")
            ->limit($perTypeLimit)
            ->get();

        foreach ($tasks as $task) {
            $workItems[] = [
                'id' => (string) $task->id,
                'type' => 'task',
                'name' => $task->title,
                'mention' => '@T-'.$task->id,
            ];
        }

        return array_slice($workItems, 0, self::RESULTS_LIMIT);
    }
}

<?php

declare(strict_types=1);

namespace App\Http\Controllers\Reports;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\Task;
use App\Models\TimeEntry;
use App\Models\WorkOrder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class TimeReportsController extends Controller
{
    public function index(Request $request): Response|RedirectResponse
    {
        $user = $request->user();
        $team = $user->currentTeam;

        if (! $team) {
            return redirect()->route('account.teams.index');
        }

        $filters = [
            'date_from' => $request->input('date_from', now()->startOfWeek()->toDateString()),
            'date_to' => $request->input('date_to', now()->endOfWeek()->toDateString()),
        ];

        $byUserData = $this->getByUserData($team->id, $filters);

        return Inertia::render('reports/time/index', [
            'byUserData' => $byUserData,
            'filters' => $filters,
        ]);
    }

    public function byUser(Request $request): JsonResponse
    {
        $user = $request->user();
        $team = $user->currentTeam;

        $filters = [
            'date_from' => $request->input('date_from', now()->startOfWeek()->toDateString()),
            'date_to' => $request->input('date_to', now()->endOfWeek()->toDateString()),
        ];

        $data = $this->getByUserData($team->id, $filters);

        return response()->json(['data' => $data]);
    }

    public function byProject(Request $request): JsonResponse
    {
        $user = $request->user();
        $team = $user->currentTeam;

        $filters = [
            'date_from' => $request->input('date_from'),
            'date_to' => $request->input('date_to'),
        ];

        $query = Project::query()
            ->forTeam($team->id)
            ->visibleTo($user->id)
            ->with([
                'workOrders' => function ($q) {
                    $q->with([
                        'tasks' => function ($tq) {
                            $tq->select('id', 'work_order_id', 'title', 'actual_hours', 'estimated_hours');
                        },
                    ])->select('id', 'project_id', 'title', 'actual_hours', 'estimated_hours');
                },
            ])
            ->select('id', 'name', 'actual_hours');

        $projects = $query->get();

        $data = $projects->map(function ($project) use ($filters) {
            $projectHours = $this->getProjectTimeEntryHours($project->id, $filters);

            return [
                'id' => $project->id,
                'name' => $project->name,
                'type' => 'project',
                'hours' => $projectHours,
                'work_orders' => $project->workOrders->map(function ($workOrder) use ($filters) {
                    $woHours = $this->getWorkOrderTimeEntryHours($workOrder->id, $filters);

                    return [
                        'id' => $workOrder->id,
                        'name' => $workOrder->title,
                        'type' => 'work_order',
                        'hours' => $woHours,
                        'tasks' => $workOrder->tasks->map(function ($task) use ($filters) {
                            $taskHours = $this->getTaskTimeEntryHours($task->id, $filters);

                            return [
                                'id' => $task->id,
                                'name' => $task->title,
                                'type' => 'task',
                                'hours' => $taskHours,
                            ];
                        })->values()->toArray(),
                    ];
                })->values()->toArray(),
            ];
        })->values()->toArray();

        return response()->json(['data' => $data]);
    }

    public function actualVsEstimated(Request $request): JsonResponse
    {
        $user = $request->user();
        $team = $user->currentTeam;

        $tasks = Task::query()
            ->forTeam($team->id)
            ->whereNotNull('estimated_hours')
            ->where('estimated_hours', '>', 0)
            ->select('id', 'title', 'estimated_hours', 'actual_hours')
            ->get()
            ->map(function ($task) {
                $estimated = (float) $task->estimated_hours;
                $actual = (float) $task->actual_hours;
                $variance = $actual - $estimated;
                $variancePercent = $estimated > 0 ? round(($variance / $estimated) * 100, 1) : 0;

                return [
                    'id' => $task->id,
                    'name' => $task->title,
                    'type' => 'task',
                    'estimated_hours' => $estimated,
                    'actual_hours' => $actual,
                    'variance' => $variance,
                    'variance_percent' => $variancePercent,
                ];
            })
            ->values()
            ->toArray();

        $workOrders = WorkOrder::query()
            ->forTeam($team->id)
            ->visibleTo($user->id)
            ->whereNotNull('estimated_hours')
            ->where('estimated_hours', '>', 0)
            ->select('id', 'title', 'estimated_hours', 'actual_hours')
            ->get()
            ->map(function ($workOrder) {
                $estimated = (float) $workOrder->estimated_hours;
                $actual = (float) $workOrder->actual_hours;
                $variance = $actual - $estimated;
                $variancePercent = $estimated > 0 ? round(($variance / $estimated) * 100, 1) : 0;

                return [
                    'id' => $workOrder->id,
                    'name' => $workOrder->title,
                    'type' => 'work_order',
                    'estimated_hours' => $estimated,
                    'actual_hours' => $actual,
                    'variance' => $variance,
                    'variance_percent' => $variancePercent,
                ];
            })
            ->values()
            ->toArray();

        return response()->json(['data' => array_merge($tasks, $workOrders)]);
    }

    private function getByUserData(int $teamId, array $filters): array
    {
        $query = TimeEntry::query()
            ->forTeam($teamId)
            ->join('users', 'time_entries.user_id', '=', 'users.id')
            ->select(
                'users.id as user_id',
                'users.name as user_name',
                DB::raw('SUM(time_entries.hours) as total_hours'),
                DB::raw('DATE(time_entries.date) as entry_date')
            )
            ->groupBy('users.id', 'users.name', 'entry_date');

        if (! empty($filters['date_from'])) {
            $query->whereDate('time_entries.date', '>=', $filters['date_from']);
        }

        if (! empty($filters['date_to'])) {
            $query->whereDate('time_entries.date', '<=', $filters['date_to']);
        }

        $entries = $query->get();

        $userTotals = $entries->groupBy('user_id')->map(function ($userEntries) {
            $first = $userEntries->first();

            $dailyHours = [];
            foreach ($userEntries as $entry) {
                $dailyHours[$entry->entry_date] = (float) $entry->total_hours;
            }

            return [
                'user_id' => $first->user_id,
                'user_name' => $first->user_name,
                'daily_hours' => $dailyHours,
                'total_hours' => $userEntries->sum('total_hours'),
            ];
        })->values()->toArray();

        return $userTotals;
    }

    private function getProjectTimeEntryHours(int $projectId, array $filters): float
    {
        $query = TimeEntry::query()
            ->join('tasks', 'time_entries.task_id', '=', 'tasks.id')
            ->join('work_orders', 'tasks.work_order_id', '=', 'work_orders.id')
            ->where('work_orders.project_id', $projectId);

        if (! empty($filters['date_from'])) {
            $query->whereDate('time_entries.date', '>=', $filters['date_from']);
        }

        if (! empty($filters['date_to'])) {
            $query->whereDate('time_entries.date', '<=', $filters['date_to']);
        }

        return (float) $query->sum('time_entries.hours');
    }

    private function getWorkOrderTimeEntryHours(int $workOrderId, array $filters): float
    {
        $query = TimeEntry::query()
            ->join('tasks', 'time_entries.task_id', '=', 'tasks.id')
            ->where('tasks.work_order_id', $workOrderId);

        if (! empty($filters['date_from'])) {
            $query->whereDate('time_entries.date', '>=', $filters['date_from']);
        }

        if (! empty($filters['date_to'])) {
            $query->whereDate('time_entries.date', '<=', $filters['date_to']);
        }

        return (float) $query->sum('time_entries.hours');
    }

    private function getTaskTimeEntryHours(int $taskId, array $filters): float
    {
        $query = TimeEntry::query()
            ->where('task_id', $taskId);

        if (! empty($filters['date_from'])) {
            $query->whereDate('date', '>=', $filters['date_from']);
        }

        if (! empty($filters['date_to'])) {
            $query->whereDate('date', '<=', $filters['date_to']);
        }

        return (float) $query->sum('hours');
    }
}

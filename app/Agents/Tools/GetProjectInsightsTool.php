<?php

declare(strict_types=1);

namespace App\Agents\Tools;

use App\Contracts\Tools\ToolInterface;
use App\Enums\AIConfidence;
use App\Enums\TaskStatus;
use App\Enums\WorkOrderStatus;
use App\Models\Deliverable;
use App\Models\Project;
use App\Models\Task;
use App\Models\Team;
use App\Models\User;
use App\Models\WorkOrder;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use InvalidArgumentException;

/**
 * Tool for generating project insights and identifying issues.
 *
 * Analyzes project data to identify overdue items, blocked tasks (bottlenecks),
 * and resource capacity vs workload imbalances. Used by PM Copilot Agent
 * for project health monitoring and proactive issue detection.
 */
class GetProjectInsightsTool implements ToolInterface
{
    /**
     * Get the unique identifier name for this tool.
     */
    public function name(): string
    {
        return 'get-project-insights';
    }

    /**
     * Get a human-readable description of what this tool does.
     */
    public function description(): string
    {
        return 'Analyzes project data to identify overdue items, bottlenecks (blocked tasks), and resource capacity issues. Returns structured insights with severity levels.';
    }

    /**
     * Get the category this tool belongs to.
     */
    public function category(): string
    {
        return 'tasks';
    }

    /**
     * Execute the tool with the given parameters.
     *
     * @param  array<string, mixed>  $params  The parameters for tool execution
     * @return array<string, mixed> The result data from execution
     *
     * @throws InvalidArgumentException If required parameters are missing or invalid
     */
    public function execute(array $params): array
    {
        $this->validateParams($params);

        $teamId = $params['team_id'];
        $projectId = $params['project_id'] ?? null;
        $includeResourceInsights = $params['include_resource_insights'] ?? true;

        // Validate team exists
        $team = Team::find($teamId);
        if ($team === null) {
            throw new InvalidArgumentException("Team with ID {$teamId} not found");
        }

        // If project_id provided, validate it exists and belongs to team
        $project = null;
        if ($projectId !== null) {
            $project = Project::where('id', $projectId)
                ->where('team_id', $teamId)
                ->first();
            if ($project === null) {
                throw new InvalidArgumentException("Project with ID {$projectId} not found or does not belong to team");
            }
        }

        // Gather insights
        $overdueItems = $this->getOverdueItems($teamId, $projectId);
        $bottlenecks = $this->getBottlenecks($teamId, $projectId);
        $resourceInsights = $includeResourceInsights
            ? $this->getResourceInsights($team, $projectId)
            : [];

        // Calculate overall severity
        $severity = $this->calculateOverallSeverity($overdueItems, $bottlenecks, $resourceInsights);

        // Determine confidence based on data quality
        $confidence = $this->determineConfidence($overdueItems, $bottlenecks, $resourceInsights);

        return [
            'success' => true,
            'project_id' => $projectId,
            'team_id' => $teamId,
            'insights' => [
                'overdue_items' => $overdueItems,
                'bottlenecks' => $bottlenecks,
                'resource_capacity' => $resourceInsights,
            ],
            'summary' => [
                'total_overdue_tasks' => count($overdueItems['tasks'] ?? []),
                'total_overdue_work_orders' => count($overdueItems['work_orders'] ?? []),
                'total_overdue_deliverables' => count($overdueItems['deliverables'] ?? []),
                'total_blocked_tasks' => count($bottlenecks['blocked_tasks'] ?? []),
                'overall_severity' => $severity,
            ],
            'confidence' => $confidence->value,
        ];
    }

    /**
     * Get the parameter definitions for this tool.
     *
     * @return array<string, array{type: string, description: string, required: bool}>
     */
    public function getParameters(): array
    {
        return [
            'team_id' => [
                'type' => 'integer',
                'description' => 'The ID of the team to analyze',
                'required' => true,
            ],
            'project_id' => [
                'type' => 'integer',
                'description' => 'The ID of a specific project to analyze (optional, analyzes all team projects if not provided)',
                'required' => false,
            ],
            'include_resource_insights' => [
                'type' => 'boolean',
                'description' => 'Whether to include resource capacity vs workload analysis (default: true)',
                'required' => false,
            ],
        ];
    }

    /**
     * Validate required parameters.
     *
     * @param  array<string, mixed>  $params
     *
     * @throws InvalidArgumentException If required parameters are missing
     */
    private function validateParams(array $params): void
    {
        if (! isset($params['team_id']) || $params['team_id'] === null) {
            throw new InvalidArgumentException('team_id is required');
        }
    }

    /**
     * Get overdue tasks, work orders, and deliverables.
     *
     * @return array<string, array<int, array<string, mixed>>>
     */
    private function getOverdueItems(int $teamId, ?int $projectId): array
    {
        $now = Carbon::now();

        // Query overdue tasks
        $tasksQuery = Task::where('team_id', $teamId)
            ->whereNotNull('due_date')
            ->where('due_date', '<', $now)
            ->whereNotIn('status', [TaskStatus::Done, TaskStatus::Approved, TaskStatus::Cancelled]);

        if ($projectId !== null) {
            $tasksQuery->where('project_id', $projectId);
        }

        $overdueTasks = $tasksQuery->get()->map(fn (Task $task) => [
            'id' => $task->id,
            'title' => $task->title,
            'due_date' => $task->due_date?->toDateString(),
            'days_overdue' => $task->due_date?->diffInDays($now),
            'status' => $task->status->value,
            'severity' => $this->calculateOverdueSeverity($task->due_date, $now),
            'work_order_id' => $task->work_order_id,
            'assigned_to_id' => $task->assigned_to_id,
        ])->toArray();

        // Query overdue work orders - use Delivered and Cancelled as completed statuses
        $workOrdersQuery = WorkOrder::where('team_id', $teamId)
            ->whereNotNull('due_date')
            ->where('due_date', '<', $now)
            ->whereNotIn('status', [WorkOrderStatus::Delivered, WorkOrderStatus::Cancelled, WorkOrderStatus::Backlog]);

        if ($projectId !== null) {
            $workOrdersQuery->where('project_id', $projectId);
        }

        $overdueWorkOrders = $workOrdersQuery->get()->map(fn (WorkOrder $wo) => [
            'id' => $wo->id,
            'title' => $wo->title,
            'due_date' => $wo->due_date?->toDateString(),
            'days_overdue' => $wo->due_date?->diffInDays($now),
            'status' => $wo->status->value,
            'severity' => $this->calculateOverdueSeverity($wo->due_date, $now),
            'project_id' => $wo->project_id,
        ])->toArray();

        // Query overdue deliverables
        $deliverablesQuery = Deliverable::where('team_id', $teamId)
            ->whereNotNull('delivered_date')
            ->where('delivered_date', '<', $now)
            ->where('status', '!=', 'delivered');

        if ($projectId !== null) {
            $deliverablesQuery->where('project_id', $projectId);
        }

        $overdueDeliverables = $deliverablesQuery->get()->map(fn (Deliverable $d) => [
            'id' => $d->id,
            'title' => $d->title,
            'due_date' => $d->delivered_date?->toDateString(),
            'days_overdue' => $d->delivered_date?->diffInDays($now),
            'status' => $d->status?->value,
            'severity' => $this->calculateOverdueSeverity($d->delivered_date, $now),
            'work_order_id' => $d->work_order_id,
        ])->toArray();

        return [
            'tasks' => $overdueTasks,
            'work_orders' => $overdueWorkOrders,
            'deliverables' => $overdueDeliverables,
        ];
    }

    /**
     * Get bottlenecks - blocked tasks and their details.
     *
     * @return array<string, mixed>
     */
    private function getBottlenecks(int $teamId, ?int $projectId): array
    {
        // Query blocked tasks
        $blockedTasksQuery = Task::where('team_id', $teamId)
            ->where('is_blocked', true);

        if ($projectId !== null) {
            $blockedTasksQuery->where('project_id', $projectId);
        }

        $blockedTasks = $blockedTasksQuery->get()->map(fn (Task $task) => [
            'id' => $task->id,
            'title' => $task->title,
            'is_blocked' => $task->is_blocked,
            'blocker_reason' => $task->blocker_reason?->value,
            'blocker_reason_label' => $task->blocker_reason?->label(),
            'blocker_details' => $task->blocker_details,
            'status' => $task->status->value,
            'work_order_id' => $task->work_order_id,
            'assigned_to_id' => $task->assigned_to_id,
        ])->toArray();

        // Group blocked tasks by blocker reason
        $blockedByReason = collect($blockedTasks)
            ->groupBy('blocker_reason')
            ->map(fn (Collection $group) => [
                'count' => $group->count(),
                'tasks' => $group->pluck('id')->toArray(),
            ])
            ->toArray();

        return [
            'blocked_tasks' => $blockedTasks,
            'by_reason' => $blockedByReason,
            'total_blocked' => count($blockedTasks),
        ];
    }

    /**
     * Get resource capacity vs workload insights.
     *
     * @return array<string, mixed>
     */
    private function getResourceInsights(Team $team, ?int $projectId): array
    {
        // Get team members with their capacity and workload
        // allUsers() returns a Collection directly (not a query builder)
        $members = $team->allUsers();

        $memberInsights = $members->map(function (User $user) use ($projectId) {
            $capacityHours = $user->capacity_hours_per_week ?? 40;
            $currentWorkload = $user->current_workload_hours ?? 0;

            // Calculate pending task hours
            $pendingTasksQuery = Task::where('assigned_to_id', $user->id)
                ->whereIn('status', [TaskStatus::Todo, TaskStatus::InProgress]);

            if ($projectId !== null) {
                $pendingTasksQuery->where('project_id', $projectId);
            }

            $pendingTaskHours = $pendingTasksQuery->sum('estimated_hours') ?? 0;
            $totalWorkload = $currentWorkload + (float) $pendingTaskHours;
            $utilizationRate = $capacityHours > 0 ? ($totalWorkload / $capacityHours) * 100 : 0;

            return [
                'user_id' => $user->id,
                'name' => $user->name,
                'capacity_hours' => $capacityHours,
                'current_workload_hours' => $currentWorkload,
                'pending_task_hours' => (float) $pendingTaskHours,
                'total_workload' => $totalWorkload,
                'utilization_rate' => round($utilizationRate, 1),
                'status' => $this->determineCapacityStatus($utilizationRate),
            ];
        })->toArray();

        // Calculate team-level metrics
        $totalCapacity = collect($memberInsights)->sum('capacity_hours');
        $totalWorkload = collect($memberInsights)->sum('total_workload');
        $teamUtilization = $totalCapacity > 0 ? ($totalWorkload / $totalCapacity) * 100 : 0;

        // Identify overloaded and available members
        $overloadedMembers = collect($memberInsights)
            ->filter(fn ($m) => $m['utilization_rate'] > 100)
            ->pluck('user_id')
            ->toArray();

        $availableMembers = collect($memberInsights)
            ->filter(fn ($m) => $m['utilization_rate'] < 75)
            ->pluck('user_id')
            ->toArray();

        return [
            'members' => $memberInsights,
            'team_summary' => [
                'total_capacity_hours' => $totalCapacity,
                'total_workload_hours' => $totalWorkload,
                'team_utilization_rate' => round($teamUtilization, 1),
                'overloaded_members' => $overloadedMembers,
                'available_members' => $availableMembers,
            ],
        ];
    }

    /**
     * Calculate overdue severity based on days overdue.
     */
    private function calculateOverdueSeverity(?Carbon $dueDate, Carbon $now): string
    {
        if ($dueDate === null) {
            return 'unknown';
        }

        $daysOverdue = $dueDate->diffInDays($now);

        return match (true) {
            $daysOverdue >= 7 => 'critical',
            $daysOverdue >= 3 => 'high',
            $daysOverdue >= 1 => 'medium',
            default => 'low',
        };
    }

    /**
     * Determine capacity status based on utilization rate.
     */
    private function determineCapacityStatus(float $utilizationRate): string
    {
        return match (true) {
            $utilizationRate > 120 => 'critically_overloaded',
            $utilizationRate > 100 => 'overloaded',
            $utilizationRate >= 75 => 'optimal',
            $utilizationRate >= 50 => 'available',
            default => 'underutilized',
        };
    }

    /**
     * Calculate overall severity from all insights.
     *
     * @param  array<string, mixed>  $overdueItems
     * @param  array<string, mixed>  $bottlenecks
     * @param  array<string, mixed>  $resourceInsights
     */
    private function calculateOverallSeverity(array $overdueItems, array $bottlenecks, array $resourceInsights): string
    {
        $criticalCount = 0;
        $highCount = 0;

        // Count critical/high severity overdue items
        foreach (['tasks', 'work_orders', 'deliverables'] as $type) {
            foreach ($overdueItems[$type] ?? [] as $item) {
                if (($item['severity'] ?? '') === 'critical') {
                    $criticalCount++;
                } elseif (($item['severity'] ?? '') === 'high') {
                    $highCount++;
                }
            }
        }

        // Count blocked tasks as high severity
        $highCount += $bottlenecks['total_blocked'] ?? 0;

        // Count overloaded team members as high severity
        $overloadedCount = count($resourceInsights['team_summary']['overloaded_members'] ?? []);
        $highCount += $overloadedCount;

        return match (true) {
            $criticalCount > 0 => 'critical',
            $highCount >= 3 => 'high',
            $highCount > 0 => 'medium',
            default => 'healthy',
        };
    }

    /**
     * Determine confidence level based on data availability.
     *
     * @param  array<string, mixed>  $overdueItems
     * @param  array<string, mixed>  $bottlenecks
     * @param  array<string, mixed>  $resourceInsights
     */
    private function determineConfidence(array $overdueItems, array $bottlenecks, array $resourceInsights): AIConfidence
    {
        $dataPoints = 0;

        // Count data points from overdue items
        $dataPoints += count($overdueItems['tasks'] ?? []);
        $dataPoints += count($overdueItems['work_orders'] ?? []);
        $dataPoints += count($overdueItems['deliverables'] ?? []);

        // Count blocked tasks
        $dataPoints += $bottlenecks['total_blocked'] ?? 0;

        // Count team members analyzed
        $dataPoints += count($resourceInsights['members'] ?? []);

        return match (true) {
            $dataPoints >= 10 => AIConfidence::High,
            $dataPoints >= 3 => AIConfidence::Medium,
            default => AIConfidence::Low,
        };
    }
}

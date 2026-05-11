<?php

declare(strict_types=1);

namespace App\Services;

use App\Agents\Tools\GetTeamCapacityTool;
use App\Enums\AIConfidence;
use App\Enums\DeliverableStatus;
use App\Enums\TaskStatus;
use App\Enums\WorkOrderStatus;
use App\Models\Deliverable;
use App\Models\Project;
use App\Models\Task;
use App\Models\WorkOrder;
use App\ValueObjects\ProjectInsight;
use Carbon\Carbon;
use Illuminate\Support\Collection;

/**
 * Service for generating project insights including overdue items,
 * bottlenecks, resource imbalances, and scope creep detection.
 *
 * Analyzes project work orders, tasks, and deliverables to provide
 * actionable insights for project managers.
 */
class ProjectInsightsService
{
    /**
     * Threshold percentage for flagging scope creep (20% over estimate).
     */
    private const SCOPE_CREEP_THRESHOLD = 0.20;

    /**
     * Minimum overload percentage to flag resource issues.
     */
    private const RESOURCE_OVERLOAD_THRESHOLD = 100;

    /**
     * Minimum available capacity percentage to consider for reallocation.
     */
    private const AVAILABLE_CAPACITY_THRESHOLD = 75;

    public function __construct() {}

    /**
     * Generate comprehensive insights for a project.
     *
     * @return array<ProjectInsight>
     */
    public function generateInsights(Project $project): array
    {
        $insights = [];

        // Load project with required relationships
        $project->load(['workOrders.tasks', 'workOrders.deliverables', 'team']);

        // Generate insights from different analysis methods
        $overdueInsights = $this->detectOverdueItems($project);
        $bottleneckInsights = $this->identifyBottlenecks($project);
        $resourceInsights = $this->generateResourceReallocationSuggestions($project);
        $scopeCreepInsights = $this->detectScopeCreep($project);

        // Merge all insights
        $insights = array_merge(
            $overdueInsights,
            $bottleneckInsights,
            $resourceInsights,
            $scopeCreepInsights
        );

        // Sort by severity (critical first)
        usort($insights, fn (ProjectInsight $a, ProjectInsight $b) => $this->compareSeverity($a->severity, $b->severity));

        return $insights;
    }

    /**
     * Detect overdue tasks, work orders, and deliverables.
     *
     * @return array<ProjectInsight>
     */
    public function detectOverdueItems(Project $project): array
    {
        $insights = [];
        $now = Carbon::now();

        // Query overdue tasks
        $overdueTasks = Task::where('project_id', $project->id)
            ->notArchived()
            ->whereNotNull('due_date')
            ->where('due_date', '<', $now)
            ->whereNotIn('status', [TaskStatus::Done, TaskStatus::Approved, TaskStatus::Cancelled])
            ->get();

        // Query overdue work orders
        $overdueWorkOrders = WorkOrder::where('project_id', $project->id)
            ->notArchived()
            ->notDelivered()
            ->whereNotNull('due_date')
            ->where('due_date', '<', $now)
            ->whereNotIn('status', [WorkOrderStatus::Cancelled])
            ->get();

        // Query overdue deliverables (using delivered_date as due date)
        $overdueDeliverables = Deliverable::where('project_id', $project->id)
            ->whereNotNull('delivered_date')
            ->where('delivered_date', '<', $now)
            ->whereNotIn('status', [DeliverableStatus::Delivered])
            ->get();

        // Group overdue items by severity
        $criticalTasks = $overdueTasks->filter(fn (Task $task) => $this->getDaysOverdue($task->due_date, $now) >= 7);
        $highTasks = $overdueTasks->filter(fn (Task $task) => $this->getDaysOverdue($task->due_date, $now) >= 3 && $this->getDaysOverdue($task->due_date, $now) < 7);
        $mediumTasks = $overdueTasks->filter(fn (Task $task) => $this->getDaysOverdue($task->due_date, $now) < 3);

        // Create insight for critical overdue tasks
        if ($criticalTasks->isNotEmpty()) {
            $insights[] = new ProjectInsight(
                type: ProjectInsight::TYPE_OVERDUE,
                severity: ProjectInsight::SEVERITY_CRITICAL,
                title: 'Critical Overdue Tasks',
                description: sprintf(
                    '%d task(s) are critically overdue (7+ days past due date). Immediate attention required.',
                    $criticalTasks->count()
                ),
                affectedItems: $this->formatAffectedItems($criticalTasks, 'task'),
                suggestion: 'Review these tasks immediately and either reschedule with stakeholders or escalate blockers.',
                confidence: AIConfidence::High
            );
        }

        // Create insight for high severity overdue tasks
        if ($highTasks->isNotEmpty()) {
            $insights[] = new ProjectInsight(
                type: ProjectInsight::TYPE_OVERDUE,
                severity: ProjectInsight::SEVERITY_HIGH,
                title: 'High Priority Overdue Tasks',
                description: sprintf(
                    '%d task(s) are overdue by 3-7 days. These need attention soon.',
                    $highTasks->count()
                ),
                affectedItems: $this->formatAffectedItems($highTasks, 'task'),
                suggestion: 'Prioritize these tasks and consider reassigning if the current assignee is overloaded.',
                confidence: AIConfidence::High
            );
        }

        // Create insight for medium severity overdue tasks
        if ($mediumTasks->isNotEmpty()) {
            $insights[] = new ProjectInsight(
                type: ProjectInsight::TYPE_OVERDUE,
                severity: ProjectInsight::SEVERITY_MEDIUM,
                title: 'Recently Overdue Tasks',
                description: sprintf(
                    '%d task(s) have recently become overdue (less than 3 days). Quick action can prevent escalation.',
                    $mediumTasks->count()
                ),
                affectedItems: $this->formatAffectedItems($mediumTasks, 'task'),
                suggestion: 'Check task status and update estimates if needed.',
                confidence: AIConfidence::Medium
            );
        }

        // Create insight for overdue work orders
        if ($overdueWorkOrders->isNotEmpty()) {
            $maxDaysOverdue = $overdueWorkOrders->max(fn (WorkOrder $wo) => $this->getDaysOverdue($wo->due_date, $now));
            $severity = $maxDaysOverdue >= 7 ? ProjectInsight::SEVERITY_CRITICAL : ($maxDaysOverdue >= 3 ? ProjectInsight::SEVERITY_HIGH : ProjectInsight::SEVERITY_MEDIUM);

            $insights[] = new ProjectInsight(
                type: ProjectInsight::TYPE_OVERDUE,
                severity: $severity,
                title: 'Overdue Work Orders',
                description: sprintf(
                    '%d work order(s) are past their due date, with the oldest being %d days overdue.',
                    $overdueWorkOrders->count(),
                    $maxDaysOverdue
                ),
                affectedItems: $this->formatAffectedItems($overdueWorkOrders, 'work_order'),
                suggestion: 'Review work order scope and timeline with stakeholders. Consider breaking down large work orders.',
                confidence: AIConfidence::High
            );
        }

        // Create insight for overdue deliverables
        if ($overdueDeliverables->isNotEmpty()) {
            $insights[] = new ProjectInsight(
                type: ProjectInsight::TYPE_OVERDUE,
                severity: ProjectInsight::SEVERITY_HIGH,
                title: 'Overdue Deliverables',
                description: sprintf(
                    '%d deliverable(s) have passed their expected delivery date.',
                    $overdueDeliverables->count()
                ),
                affectedItems: $this->formatAffectedItems($overdueDeliverables, 'deliverable'),
                suggestion: 'Coordinate with assigned team members to get status updates and revised ETAs.',
                confidence: AIConfidence::High
            );
        }

        return $insights;
    }

    /**
     * Identify bottlenecks from blocked tasks.
     *
     * @return array<ProjectInsight>
     */
    public function identifyBottlenecks(Project $project): array
    {
        $insights = [];

        // Query blocked tasks
        $blockedTasks = Task::where('project_id', $project->id)
            ->notArchived()
            ->where('is_blocked', true)
            ->whereNotIn('status', [TaskStatus::Done, TaskStatus::Approved, TaskStatus::Cancelled])
            ->get();

        if ($blockedTasks->isEmpty()) {
            return $insights;
        }

        // Group blocked tasks by blocker reason
        $groupedByReason = $blockedTasks->groupBy(fn (Task $task) => $task->blocker_reason?->value ?? 'unknown');

        foreach ($groupedByReason as $reason => $tasks) {
            $reasonLabel = $tasks->first()->blocker_reason?->label() ?? 'Unknown Reason';
            $severity = $tasks->count() >= 3 ? ProjectInsight::SEVERITY_HIGH : ProjectInsight::SEVERITY_MEDIUM;

            $insights[] = new ProjectInsight(
                type: ProjectInsight::TYPE_BOTTLENECK,
                severity: $severity,
                title: sprintf('Bottleneck: %s', $reasonLabel),
                description: sprintf(
                    '%d task(s) are blocked due to "%s". This is impacting project progress.',
                    $tasks->count(),
                    $reasonLabel
                ),
                affectedItems: $this->formatAffectedItems($tasks, 'task'),
                suggestion: $this->getSuggestionForBlockerReason($reason),
                confidence: AIConfidence::High
            );
        }

        // If there are many blocked tasks across different reasons, add a summary insight
        if ($blockedTasks->count() >= 5 && $groupedByReason->count() >= 2) {
            $insights[] = new ProjectInsight(
                type: ProjectInsight::TYPE_BOTTLENECK,
                severity: ProjectInsight::SEVERITY_CRITICAL,
                title: 'Multiple Bottlenecks Detected',
                description: sprintf(
                    'The project has %d blocked tasks across %d different reasons. This indicates systemic issues that need addressing.',
                    $blockedTasks->count(),
                    $groupedByReason->count()
                ),
                affectedItems: $this->formatAffectedItems($blockedTasks, 'task'),
                suggestion: 'Schedule a blocker review meeting with the team to address these issues systematically.',
                confidence: AIConfidence::High
            );
        }

        return $insights;
    }

    /**
     * Generate resource reallocation suggestions.
     *
     * @return array<ProjectInsight>
     */
    public function generateResourceReallocationSuggestions(Project $project): array
    {
        $insights = [];

        if ($project->team === null) {
            return $insights;
        }

        // Use GetTeamCapacityTool to get capacity data
        $capacityTool = new GetTeamCapacityTool;

        try {
            $capacityResult = $capacityTool->execute(['team_id' => $project->team_id]);
        } catch (\Exception) {
            // If capacity tool fails, return empty insights
            return $insights;
        }

        $teamCapacity = $capacityResult['team_capacity'] ?? [];
        if (empty($teamCapacity)) {
            return $insights;
        }

        // Identify overloaded members
        $overloadedMembers = array_filter(
            $teamCapacity,
            fn (array $member) => $member['utilization_percentage'] > self::RESOURCE_OVERLOAD_THRESHOLD
        );

        // Identify members with available capacity
        $availableMembers = array_filter(
            $teamCapacity,
            fn (array $member) => $member['utilization_percentage'] < self::AVAILABLE_CAPACITY_THRESHOLD
        );

        // Create insight for overloaded members
        if (! empty($overloadedMembers)) {
            $memberNames = array_map(fn (array $m) => $m['user_name'], $overloadedMembers);
            $affectedItems = array_map(fn (array $m) => [
                'id' => $m['user_id'],
                'type' => 'user',
                'title' => sprintf('%s (%.0f%% utilization)', $m['user_name'], $m['utilization_percentage']),
            ], $overloadedMembers);

            $severity = count($overloadedMembers) >= 2 ? ProjectInsight::SEVERITY_HIGH : ProjectInsight::SEVERITY_MEDIUM;

            $suggestion = ! empty($availableMembers)
                ? sprintf(
                    'Consider redistributing tasks to team members with available capacity: %s.',
                    implode(', ', array_map(fn (array $m) => $m['user_name'], array_slice($availableMembers, 0, 3)))
                )
                : 'Consider extending deadlines or bringing in additional resources.';

            $insights[] = new ProjectInsight(
                type: ProjectInsight::TYPE_RESOURCE,
                severity: $severity,
                title: 'Overloaded Team Members',
                description: sprintf(
                    '%d team member(s) are overloaded with work exceeding their capacity: %s.',
                    count($overloadedMembers),
                    implode(', ', $memberNames)
                ),
                affectedItems: $affectedItems,
                suggestion: $suggestion,
                confidence: AIConfidence::Medium
            );
        }

        // Create insight if there's a significant capacity imbalance
        if (! empty($overloadedMembers) && ! empty($availableMembers)) {
            $totalOverloadedHours = array_sum(array_map(
                fn (array $m) => max(0, $m['current_workload_hours'] - $m['capacity_hours_per_week']),
                $overloadedMembers
            ));

            $totalAvailableHours = array_sum(array_map(
                fn (array $m) => $m['available_capacity'],
                $availableMembers
            ));

            if ($totalOverloadedHours > 0 && $totalAvailableHours >= $totalOverloadedHours * 0.5) {
                $insights[] = new ProjectInsight(
                    type: ProjectInsight::TYPE_RESOURCE,
                    severity: ProjectInsight::SEVERITY_LOW,
                    title: 'Capacity Reallocation Opportunity',
                    description: sprintf(
                        'There are approximately %.0f excess hours of work and %.0f available hours in the team. Redistribution could improve overall efficiency.',
                        $totalOverloadedHours,
                        $totalAvailableHours
                    ),
                    affectedItems: [],
                    suggestion: 'Review task assignments and consider reassigning some tasks from overloaded members to those with capacity.',
                    confidence: AIConfidence::Medium
                );
            }
        }

        return $insights;
    }

    /**
     * Detect scope creep by comparing estimates to actuals.
     *
     * @return array<ProjectInsight>
     */
    public function detectScopeCreep(Project $project): array
    {
        $insights = [];

        // Analyze work orders for scope creep
        $workOrdersWithScopeIssues = WorkOrder::where('project_id', $project->id)
            ->notArchived()
            ->notDelivered()
            ->whereNotNull('estimated_hours')
            ->where('estimated_hours', '>', 0)
            ->whereNotNull('actual_hours')
            ->whereRaw('actual_hours > estimated_hours * ?', [1 + self::SCOPE_CREEP_THRESHOLD])
            ->whereNotIn('status', [WorkOrderStatus::Cancelled])
            ->get();

        if ($workOrdersWithScopeIssues->isEmpty()) {
            return $insights;
        }

        // Calculate total variance
        $totalEstimated = $workOrdersWithScopeIssues->sum('estimated_hours');
        $totalActual = $workOrdersWithScopeIssues->sum('actual_hours');
        $overagePercentage = $totalEstimated > 0 ? (($totalActual - $totalEstimated) / $totalEstimated) * 100 : 0;

        // Determine severity based on overage
        $severity = match (true) {
            $overagePercentage >= 50 => ProjectInsight::SEVERITY_CRITICAL,
            $overagePercentage >= 30 => ProjectInsight::SEVERITY_HIGH,
            default => ProjectInsight::SEVERITY_MEDIUM,
        };

        // Build affected items list
        $affectedItems = $workOrdersWithScopeIssues->map(function (WorkOrder $wo) {
            $overage = (($wo->actual_hours - $wo->estimated_hours) / $wo->estimated_hours) * 100;

            return [
                'id' => $wo->id,
                'type' => 'work_order',
                'title' => sprintf('%s (+%.0f%% over estimate)', $wo->title, $overage),
            ];
        })->toArray();

        $insights[] = new ProjectInsight(
            type: ProjectInsight::TYPE_SCOPE_CREEP,
            severity: $severity,
            title: 'Scope Creep Detected',
            description: sprintf(
                '%d work order(s) have exceeded their estimated hours by more than 20%%. Total variance: %.0f hours (%.0f%% over estimate).',
                $workOrdersWithScopeIssues->count(),
                $totalActual - $totalEstimated,
                $overagePercentage
            ),
            affectedItems: $affectedItems,
            suggestion: 'Review work order scope definitions and acceptance criteria. Consider implementing change request processes for scope additions.',
            confidence: $this->determineConfidenceForScopeCreep($workOrdersWithScopeIssues)
        );

        // Check for tasks that are individually over estimate
        $tasksOverEstimate = Task::where('project_id', $project->id)
            ->notArchived()
            ->whereNotNull('estimated_hours')
            ->where('estimated_hours', '>', 0)
            ->whereNotNull('actual_hours')
            ->whereRaw('actual_hours > estimated_hours * ?', [1 + self::SCOPE_CREEP_THRESHOLD])
            ->whereNotIn('status', [TaskStatus::Cancelled])
            ->get();

        if ($tasksOverEstimate->count() >= 3) {
            $taskOverageItems = $tasksOverEstimate->map(function (Task $task) {
                $overage = (($task->actual_hours - $task->estimated_hours) / $task->estimated_hours) * 100;

                return [
                    'id' => $task->id,
                    'type' => 'task',
                    'title' => sprintf('%s (+%.0f%% over estimate)', $task->title, $overage),
                ];
            })->toArray();

            $insights[] = new ProjectInsight(
                type: ProjectInsight::TYPE_SCOPE_CREEP,
                severity: ProjectInsight::SEVERITY_MEDIUM,
                title: 'Tasks Exceeding Estimates',
                description: sprintf(
                    '%d task(s) have exceeded their estimated hours. This may indicate estimation issues or scope changes at the task level.',
                    $tasksOverEstimate->count()
                ),
                affectedItems: $taskOverageItems,
                suggestion: 'Review estimation practices. Consider breaking down large tasks into smaller, more predictable units.',
                confidence: AIConfidence::Medium
            );
        }

        return $insights;
    }

    /**
     * Calculate days overdue for a given due date.
     */
    private function getDaysOverdue(?Carbon $dueDate, Carbon $now): int
    {
        if ($dueDate === null) {
            return 0;
        }

        return (int) max(0, $dueDate->diffInDays($now, false));
    }

    /**
     * Format items for the affected_items array.
     *
     * @param  Collection<int, Task|WorkOrder|Deliverable>  $items
     * @return array<int, array{id: int, type: string, title: string}>
     */
    private function formatAffectedItems(Collection $items, string $type): array
    {
        return $items->map(fn ($item) => [
            'id' => $item->id,
            'type' => $type,
            'title' => $item->title,
        ])->toArray();
    }

    /**
     * Get suggestion based on blocker reason.
     */
    private function getSuggestionForBlockerReason(string $reason): string
    {
        return match ($reason) {
            'waiting_on_external' => 'Follow up with external parties and set up escalation paths if responses are delayed.',
            'missing_information' => 'Identify the information needed and reach out to stakeholders who can provide it.',
            'technical_issue' => 'Engage technical leads or specialists to help resolve the blocking issues.',
            'waiting_on_approval' => 'Expedite the approval process by notifying approvers of the pending items.',
            default => 'Review the blocker details and determine appropriate next steps.',
        };
    }

    /**
     * Compare severity levels for sorting.
     */
    private function compareSeverity(string $a, string $b): int
    {
        $order = [
            ProjectInsight::SEVERITY_CRITICAL => 0,
            ProjectInsight::SEVERITY_HIGH => 1,
            ProjectInsight::SEVERITY_MEDIUM => 2,
            ProjectInsight::SEVERITY_LOW => 3,
        ];

        return ($order[$a] ?? 4) <=> ($order[$b] ?? 4);
    }

    /**
     * Determine confidence level for scope creep based on data quality.
     *
     * @param  Collection<int, WorkOrder>  $workOrders
     */
    private function determineConfidenceForScopeCreep(Collection $workOrders): AIConfidence
    {
        // Higher confidence if we have more data points
        $count = $workOrders->count();

        return match (true) {
            $count >= 5 => AIConfidence::High,
            $count >= 2 => AIConfidence::Medium,
            default => AIConfidence::Low,
        };
    }
}

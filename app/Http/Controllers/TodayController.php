<?php

namespace App\Http\Controllers;

use App\Enums\BlockerReason;
use App\Enums\InboxItemType;
use App\Enums\TaskStatus;
use App\Enums\WorkOrderStatus;
use App\Models\AuditLog;
use App\Models\InboxItem;
use App\Models\Task;
use App\Models\Team;
use App\Models\TimeEntry;
use App\Models\User;
use App\Models\WorkOrder;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TodayController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $team = $user->currentTeam;

        if (! $team) {
            return Inertia::render('today', $this->emptyResponse());
        }

        return Inertia::render('today', [
            'dailySummary' => $this->getDailySummary($team, $user),
            'approvals' => $this->getApprovals($team),
            'tasks' => $this->getTasks($team, $user),
            'blockers' => $this->getBlockers($team),
            'upcomingDeadlines' => $this->getUpcomingDeadlines($team),
            'activities' => $this->getActivities($team),
            'metrics' => $this->getMetrics($team, $user),
        ]);
    }

    private function getDailySummary(Team $team, User $user): array
    {
        $pendingApprovals = InboxItem::forTeam($team->id)
            ->byType(InboxItemType::Approval)
            ->count();

        $overdueTasks = Task::forTeam($team->id)
            ->assignedTo($user->id)
            ->where('status', '!=', TaskStatus::Done)
            ->where('due_date', '<', Carbon::today())
            ->count();

        $upcomingDeadlines = WorkOrder::forTeam($team->id)
            ->whereNotIn('status', [WorkOrderStatus::Delivered->value, WorkOrderStatus::Approved->value])
            ->notBacklog()
            ->whereBetween('due_date', [Carbon::today(), Carbon::today()->addDays(3)])
            ->count();

        $priorities = [];
        if ($overdueTasks > 0) {
            $priorities[] = "Address {$overdueTasks} overdue ".($overdueTasks === 1 ? 'task' : 'tasks');
        }
        if ($pendingApprovals > 0) {
            $priorities[] = "Review {$pendingApprovals} pending ".($pendingApprovals === 1 ? 'approval' : 'approvals');
        }
        if ($upcomingDeadlines > 0) {
            $priorities[] = "Check {$upcomingDeadlines} upcoming ".($upcomingDeadlines === 1 ? 'deadline' : 'deadlines');
        }
        if (empty($priorities)) {
            $priorities[] = 'Review your task list for today';
            $priorities[] = 'Check upcoming work orders';
        }

        $summary = match (true) {
            $overdueTasks > 0 => "You have {$overdueTasks} overdue ".($overdueTasks === 1 ? 'task' : 'tasks').' that need attention.',
            $pendingApprovals > 0 => "You have {$pendingApprovals} ".($pendingApprovals === 1 ? 'approval' : 'approvals').' waiting for review.',
            default => "You're all caught up! Check your upcoming deadlines.",
        };

        $suggestedFocus = match (true) {
            $overdueTasks > 0 => 'Focus on clearing overdue tasks first.',
            $pendingApprovals > 0 => 'Start by reviewing pending approvals to unblock work.',
            $upcomingDeadlines > 0 => 'Prepare for upcoming deadlines.',
            default => 'Great progress! Keep up the momentum.',
        };

        return [
            'generatedAt' => now()->toISOString(),
            'summary' => $summary,
            'priorities' => $priorities,
            'suggestedFocus' => $suggestedFocus,
        ];
    }

    private function getApprovals(Team $team): array
    {
        return InboxItem::forTeam($team->id)
            ->byType(InboxItemType::Approval)
            ->with(['relatedWorkOrder.project'])
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get()
            ->map(fn (InboxItem $item) => [
                'id' => (string) $item->id,
                'type' => $this->mapApprovalType($item->source_type?->value),
                'title' => $item->title,
                'description' => $item->content_preview ?? '',
                'createdBy' => $item->source_name ?? 'System',
                'createdAt' => $item->created_at->toISOString(),
                'workOrderId' => $item->related_work_order_id
                    ? (string) $item->related_work_order_id
                    : '',
                'workOrderTitle' => $item->related_work_order_title ?? '',
                'projectTitle' => $item->related_project_name ?? '',
                'priority' => $this->mapUrgencyToPriority($item->urgency?->value),
                'dueDate' => $item->relatedWorkOrder?->due_date?->toISOString() ?? '',
            ])
            ->all();
    }

    private function getTasks(Team $team, User $user): array
    {
        return Task::forTeam($team->id)
            ->assignedTo($user->id)
            ->whereIn('status', [TaskStatus::Todo, TaskStatus::InProgress])
            ->with(['workOrder.project', 'assignedTo'])
            ->orderByRaw('CASE WHEN due_date < ? THEN 0 WHEN due_date = ? THEN 1 ELSE 2 END', [Carbon::today(), Carbon::today()])
            ->orderBy('due_date')
            ->limit(10)
            ->get()
            ->map(fn (Task $task) => [
                'id' => (string) $task->id,
                'title' => $task->title,
                'description' => $task->description ?? '',
                'status' => $this->mapTaskStatus($task->status->value),
                'priority' => $this->getTaskPriority($task),
                'dueDate' => $task->due_date?->toISOString() ?? '',
                'isOverdue' => $task->due_date ? $task->due_date->lt(Carbon::today()) : false,
                'isDueToday' => $task->due_date ? $task->due_date->isToday() : false,
                'assignedTo' => $task->assignedTo?->name ?? 'Unassigned',
                'workOrderId' => (string) $task->work_order_id,
                'workOrderTitle' => $task->workOrder?->title ?? '',
                'projectTitle' => $task->workOrder?->project?->name ?? '',
                'estimatedHours' => (float) ($task->estimated_hours ?? 0),
            ])
            ->all();
    }

    private function getBlockers(Team $team): array
    {
        return Task::forTeam($team->id)
            ->where('is_blocked', true)
            ->with(['workOrder.project', 'assignedTo'])
            ->orderBy('updated_at', 'desc')
            ->limit(10)
            ->get()
            ->map(fn (Task $task) => [
                'id' => (string) $task->id,
                'type' => 'task',
                'title' => $task->title,
                'reason' => $task->blocker_reason?->value ?? BlockerReason::MissingInformation->value,
                'blockerDetails' => $task->blocker_details ?? 'This task has been flagged as blocked.',
                'blockedSince' => $task->updated_at->toISOString(),
                'workOrderId' => (string) $task->work_order_id,
                'workOrderTitle' => $task->workOrder?->title ?? '',
                'projectTitle' => $task->workOrder?->project?->name ?? '',
                'priority' => $this->getTaskPriority($task),
                'assignedTo' => $task->assignedTo?->name ?? 'Unassigned',
            ])
            ->all();
    }

    private function getUpcomingDeadlines(Team $team): array
    {
        return WorkOrder::forTeam($team->id)
            ->whereNotIn('status', [WorkOrderStatus::Delivered->value, WorkOrderStatus::Approved->value])
            ->notBacklog()
            ->where('due_date', '>=', Carbon::today())
            ->where('due_date', '<=', Carbon::today()->addDays(14))
            ->with(['project', 'assignedTo', 'tasks'])
            ->orderBy('due_date')
            ->limit(10)
            ->get()
            ->map(fn (WorkOrder $wo) => [
                'id' => (string) $wo->id,
                'title' => $wo->title,
                'projectTitle' => $wo->project?->name ?? '',
                'dueDate' => $wo->due_date->toISOString(),
                'daysUntilDue' => (int) Carbon::today()->diffInDays($wo->due_date, false),
                'status' => $this->mapWorkOrderStatus($wo->status->value),
                'progress' => $this->calculateProgress($wo),
                'priority' => $this->mapPriority($wo->priority->value),
                'assignedTeam' => $this->getAssignedTeam($wo),
            ])
            ->all();
    }

    private function getActivities(Team $team): array
    {
        return AuditLog::where('team_id', $team->id)
            ->orderBy('created_at', 'desc')
            ->limit(15)
            ->get()
            ->map(fn (AuditLog $log) => [
                'id' => (string) $log->id,
                'type' => $this->mapAuditAction($log->action),
                'title' => $this->getActivityTitle($log),
                'description' => $log->details ?? '',
                'timestamp' => $log->created_at->toISOString(),
                'user' => $log->actor_name ?? 'System',
                'workOrderTitle' => '',
                'projectTitle' => '',
            ])
            ->all();
    }

    private function getMetrics(Team $team, User $user): array
    {
        $today = Carbon::today();
        $weekStart = Carbon::now()->startOfWeek();

        return [
            'tasksCompletedToday' => Task::forTeam($team->id)
                ->withStatus(TaskStatus::Done)
                ->whereDate('updated_at', $today)
                ->count(),

            'tasksCompletedThisWeek' => Task::forTeam($team->id)
                ->withStatus(TaskStatus::Done)
                ->where('updated_at', '>=', $weekStart)
                ->count(),

            'approvalsPending' => InboxItem::forTeam($team->id)
                ->byType(InboxItemType::Approval)
                ->count(),

            'hoursLoggedToday' => (float) TimeEntry::forTeam($team->id)
                ->forUser($user->id)
                ->forDate($today)
                ->sum('hours'),

            'activeBlockers' => Task::forTeam($team->id)
                ->where('is_blocked', true)
                ->count(),
        ];
    }

    private function emptyResponse(): array
    {
        return [
            'dailySummary' => [
                'generatedAt' => now()->toISOString(),
                'summary' => 'Welcome! Join or create a team to get started.',
                'priorities' => [],
                'suggestedFocus' => '',
            ],
            'approvals' => [],
            'tasks' => [],
            'blockers' => [],
            'upcomingDeadlines' => [],
            'activities' => [],
            'metrics' => [
                'tasksCompletedToday' => 0,
                'tasksCompletedThisWeek' => 0,
                'approvalsPending' => 0,
                'hoursLoggedToday' => 0.0,
                'activeBlockers' => 0,
            ],
        ];
    }

    private function mapApprovalType(?string $sourceType): string
    {
        return match ($sourceType) {
            'deliverable' => 'deliverable',
            'estimate' => 'estimate',
            default => 'draft',
        };
    }

    private function mapUrgencyToPriority(?string $urgency): string
    {
        return match ($urgency) {
            'urgent', 'high' => 'high',
            'normal' => 'medium',
            default => 'low',
        };
    }

    private function mapTaskStatus(string $status): string
    {
        return match ($status) {
            'done' => 'completed',
            default => $status,
        };
    }

    private function getTaskPriority(Task $task): string
    {
        $woP = $task->workOrder?->priority?->value;

        return match ($woP) {
            'urgent', 'high' => 'high',
            'medium' => 'medium',
            default => 'low',
        };
    }

    private function mapWorkOrderStatus(string $status): string
    {
        return match ($status) {
            'draft' => 'draft',
            'active' => 'in_progress',
            'in_review' => 'review',
            'approved', 'delivered' => 'completed',
            default => 'planning',
        };
    }

    private function mapPriority(string $priority): string
    {
        return match ($priority) {
            'urgent', 'high' => 'high',
            'medium' => 'medium',
            default => 'low',
        };
    }

    private function calculateProgress(WorkOrder $wo): int
    {
        $total = $wo->tasks->count();
        if ($total === 0) {
            return 0;
        }
        $done = $wo->tasks->where('status', TaskStatus::Done)->count();

        return (int) round(($done / $total) * 100);
    }

    private function getAssignedTeam(WorkOrder $wo): array
    {
        $names = [];
        if ($wo->assignedTo) {
            $names[] = $wo->assignedTo->name;
        }
        foreach ($wo->tasks as $task) {
            if ($task->assignedTo && ! in_array($task->assignedTo->name, $names)) {
                $names[] = $task->assignedTo->name;
            }
        }

        return array_slice($names, 0, 3);
    }

    private function mapAuditAction(?string $action): string
    {
        return match ($action) {
            'task.completed', 'task.done' => 'task_completed',
            'task.started', 'task.in_progress' => 'task_started',
            'approval.created' => 'approval_created',
            'comment.created' => 'comment_added',
            'deliverable.submitted' => 'deliverable_submitted',
            'task.blocked' => 'blocker_flagged',
            'time_entry.created' => 'time_logged',
            'work_order.created' => 'work_order_created',
            default => 'task_completed',
        };
    }

    private function getActivityTitle(AuditLog $log): string
    {
        return match ($log->action) {
            'task.completed', 'task.done' => 'Task completed',
            'task.started', 'task.in_progress' => 'Work started',
            'approval.created' => 'New approval request',
            'comment.created' => 'Comment added',
            'deliverable.submitted' => 'Deliverable submitted',
            'task.blocked' => 'Blocker flagged',
            'time_entry.created' => 'Time logged',
            'work_order.created' => 'Work order created',
            default => ucfirst(str_replace('.', ' ', $log->action ?? 'Activity')),
        };
    }
}

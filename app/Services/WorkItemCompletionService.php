<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\TaskStatus;
use App\Enums\WorkOrderStatus;
use App\Exceptions\InvalidTransitionException;
use App\Models\Task;
use App\Models\User;
use App\Models\WorkOrder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

class WorkItemCompletionService
{
    public function __construct(
        private readonly WorkflowTransitionService $transitions,
    ) {}

    /**
     * Titles of the work order's open tasks that cannot transition directly to
     * Done. Open tasks are those not already in a finished state (Done,
     * Cancelled, or Archived).
     *
     * @return array<int, string>
     */
    public function uncompletableTaskTitles(WorkOrder $workOrder, User $user): array
    {
        return $this->openTasks($workOrder)
            ->reject(fn (Task $task) => in_array(TaskStatus::Done->value, $this->transitions->getAvailableTransitions($task, $user), true))
            ->map(fn (Task $task) => $task->title)
            ->values()
            ->all();
    }

    /**
     * Deliver (if not already delivered) and archive a work order: complete its
     * open tasks, record the delivered transition, set the status to archived,
     * and recalculate project progress.
     *
     * Callers must ensure uncompletableTaskTitles() is empty first.
     */
    public function deliverAndArchive(WorkOrder $workOrder, User $user): void
    {
        DB::transaction(function () use ($workOrder, $user): void {
            $this->completeOpenTasks($workOrder, $user, 'Auto-completed: work order delivered and archived.');

            $fromStatus = $workOrder->status;

            if ($fromStatus !== WorkOrderStatus::Delivered) {
                $workOrder->statusTransitions()->create([
                    'user_id' => $user->id,
                    'from_status' => $fromStatus->value,
                    'to_status' => WorkOrderStatus::Delivered->value,
                    'comment' => 'Marked as delivered and archived.',
                    'created_at' => now(),
                ]);
            }

            $workOrder->update(['status' => WorkOrderStatus::Archived]);
        });

        $workOrder->project->recalculateProgress();
    }

    /**
     * Archive a work order without delivering it: complete its open tasks, set
     * the status to archived, and recalculate project progress.
     *
     * Callers must ensure uncompletableTaskTitles() is empty first.
     */
    public function archive(WorkOrder $workOrder, User $user): void
    {
        DB::transaction(function () use ($workOrder, $user): void {
            $this->completeOpenTasks($workOrder, $user, 'Auto-completed: work order archived.');

            $workOrder->update(['status' => WorkOrderStatus::Archived]);
        });

        $workOrder->project->recalculateProgress();
    }

    /**
     * Mark a task done (recording the transition) and archive it, then
     * recalculate project progress. Unlike the workflow graph, this completes
     * the task from any active status so a review "Completed" always succeeds.
     */
    public function completeAndArchiveTask(Task $task, User $user): void
    {
        DB::transaction(function () use ($task, $user): void {
            if ($task->status !== TaskStatus::Done) {
                $task->statusTransitions()->create([
                    'user_id' => $user->id,
                    'from_status' => $task->status->value,
                    'to_status' => TaskStatus::Done->value,
                    'comment' => 'Marked complete from review.',
                    'created_at' => now(),
                ]);
            }

            $task->update(['status' => TaskStatus::Archived]);
        });

        $task->project->recalculateProgress();
    }

    /**
     * Transition every open task on the work order to Done through the workflow
     * service. Tasks whose transition is denied (e.g. an Approved task whose
     * actor lacks delivery permission) are skipped.
     *
     * Only call this after uncompletableTaskTitles() returns an empty array.
     */
    private function completeOpenTasks(WorkOrder $workOrder, User $user, string $comment): void
    {
        foreach ($this->openTasks($workOrder) as $task) {
            try {
                $this->transitions->transition($task, $user, TaskStatus::Done, $comment);
            } catch (InvalidTransitionException) {
                continue;
            }
        }
    }

    /**
     * The work order's tasks that are not yet in a finished state.
     *
     * @return Collection<int, Task>
     */
    private function openTasks(WorkOrder $workOrder): Collection
    {
        $finished = [TaskStatus::Done, TaskStatus::Cancelled, TaskStatus::Archived];

        return $workOrder->tasks
            ->reject(fn (Task $task) => in_array($task->status, $finished, true))
            ->values();
    }
}

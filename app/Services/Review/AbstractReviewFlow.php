<?php

declare(strict_types=1);

namespace App\Services\Review;

use App\Models\ReviewSnooze;
use App\Models\Task;
use App\Models\User;
use App\Models\WorkOrder;
use App\Services\Review\Contracts\ReviewFlow;
use Illuminate\Database\Eloquent\Builder;

abstract class AbstractReviewFlow implements ReviewFlow
{
    /**
     * Remove items the user has snoozed (and whose snooze has not yet expired)
     * for this flow.
     */
    protected function excludeSnoozed(Builder $query, User $user): Builder
    {
        $modelClass = $this->type()->entityType()->modelClass();
        $morphClass = (new $modelClass)->getMorphClass();

        $snoozedIds = ReviewSnooze::query()
            ->forUserAndFlow($user->id, $this->type()->value)
            ->active()
            ->where('snoozable_type', $morphClass)
            ->pluck('snoozable_id');

        if ($snoozedIds->isNotEmpty()) {
            $query->whereNotIn('id', $snoozedIds);
        }

        return $query;
    }

    /**
     * @return array<string, mixed>
     */
    protected function mapWorkOrder(WorkOrder $workOrder): array
    {
        return [
            'id' => (string) $workOrder->id,
            'entityType' => 'work_order',
            'title' => $workOrder->title,
            'description' => $workOrder->description ?? '',
            'projectTitle' => $workOrder->project?->name ?? '',
            'workOrderTitle' => null,
            'status' => $workOrder->status->value,
            'statusLabel' => $workOrder->status->label(),
            'priority' => $workOrder->priority->value,
            'dueDate' => $workOrder->due_date?->toDateString(),
            'assignedTo' => $workOrder->assignedTo?->name,
            'href' => "/work/work-orders/{$workOrder->id}",
        ];
    }

    /**
     * @return array<string, mixed>
     */
    protected function mapTask(Task $task): array
    {
        return [
            'id' => (string) $task->id,
            'entityType' => 'task',
            'title' => $task->title,
            'description' => $task->description ?? '',
            'projectTitle' => $task->workOrder?->project?->name ?? '',
            'workOrderTitle' => $task->workOrder?->title ?? '',
            'status' => $task->status->value,
            'statusLabel' => $task->status->label(),
            'priority' => $task->workOrder?->priority?->value ?? 'medium',
            'dueDate' => $task->due_date?->toDateString(),
            'assignedTo' => $task->assignedTo?->name,
            'href' => "/work/tasks/{$task->id}",
        ];
    }
}

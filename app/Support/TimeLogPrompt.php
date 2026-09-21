<?php

declare(strict_types=1);

namespace App\Support;

use App\Models\Task;

/**
 * The payload that asks whoever just closed a task to estimate the hours they
 * spent on it.
 *
 * A task closed with nothing in the time tracker leaves actual_hours at zero,
 * which silently under-counts every hours, cost and profitability rollup built
 * on top of it. Rather than block the close, the closing endpoints hand this
 * back and the UI asks afterwards; the answer is an ordinary manual TimeEntry.
 */
final class TimeLogPrompt
{
    /**
     * Null when the task already has hours against it, and so has nothing to ask about.
     *
     * The guard is the summed hours rather than the existence of a row, because
     * TimeEntry::startTimer() inserts a row with hours = 0 the moment a timer starts and
     * only stopTimer() fills it in. Testing existence would let the commonest case of all
     * — a timer left running, or stopped before it registered a minute — close a task at
     * zero logged hours without ever asking.
     *
     * @return array{taskId: string, taskTitle: string, estimatedHours: float|null}|null
     */
    public static function forTask(Task $task): ?array
    {
        if ((float) $task->timeEntries()->sum('hours') > 0) {
            return null;
        }

        return [
            'taskId' => (string) $task->id,
            'taskTitle' => $task->title,
            'estimatedHours' => self::prefillableEstimate($task),
        ];
    }

    /**
     * The task's estimate, but only when the log-time form would actually accept it.
     *
     * estimated_hours is non-nullable and defaults to 0, and nothing caps it on the way in,
     * so both ends need guarding against the form's own 0.01–24 range. Seeding a field with
     * a value it then rejects would hand the user a validation error on input they never
     * typed.
     */
    private static function prefillableEstimate(Task $task): ?float
    {
        $estimate = (float) $task->estimated_hours;

        return ($estimate > 0 && $estimate <= 24) ? $estimate : null;
    }
}

<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Models\Task;
use App\Models\User;
use App\Models\WorkOrder;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * Daily digest of a user's tasks and work orders that are due today or overdue.
 *
 * Sent once per day at the user's preferred local hour, listing only
 * actionable (non-completed) tasks and work orders assigned to them, each
 * linking to its detail page.
 */
class DailyTaskDigestNotification extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * @param  Collection<int, Task>  $tasks  The user's due/overdue tasks
     * @param  Collection<int, WorkOrder>  $workOrders  The user's due/overdue work orders
     */
    public function __construct(
        private readonly Collection $tasks,
        private readonly Collection $workOrders,
    ) {}

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        $today = $this->today($notifiable);
        $count = $this->tasks->count() + $this->workOrders->count();

        $mailMessage = (new MailMessage)
            ->subject("You have {$count} ".str('item')->plural($count).' due')
            ->greeting('Hello '.($notifiable->name ?? 'there').',')
            ->line("Here is your work due on or before {$today->toFormattedDateString()}:");

        if ($this->tasks->isNotEmpty()) {
            $mailMessage->line('**Tasks**');

            foreach ($this->tasks as $task) {
                $mailMessage->line($this->formatTaskLine($task, $today));
            }
        }

        if ($this->workOrders->isNotEmpty()) {
            $mailMessage->line('**Work orders**');

            foreach ($this->workOrders as $workOrder) {
                $mailMessage->line($this->formatWorkOrderLine($workOrder, $today));
            }
        }

        $mailMessage
            ->action('View Today', url('/today'))
            ->line('Stay on top of your work — knock these out today.');

        return $mailMessage;
    }

    /**
     * Build a single human-readable line describing a task, linking to its detail page.
     */
    private function formatTaskLine(Task $task, Carbon $today): string
    {
        $parts = ["[**{$task->title}**](".route('tasks.show', $task).')'];

        $context = $task->workOrder?->title ?? $task->project?->name;
        if ($context !== null) {
            $parts[] = "({$context})";
        }

        $parts[] = $this->dueLabel($task->due_date, $today);

        return implode(' ', array_filter($parts));
    }

    /**
     * Build a single human-readable line describing a work order, linking to its detail page.
     */
    private function formatWorkOrderLine(WorkOrder $workOrder, Carbon $today): string
    {
        $parts = ["[**{$workOrder->title}**](".route('work-orders.show', $workOrder).')'];

        if ($workOrder->project?->name !== null) {
            $parts[] = "({$workOrder->project->name})";
        }

        $parts[] = $this->dueLabel($workOrder->due_date, $today);

        return implode(' ', array_filter($parts));
    }

    /**
     * Format the "OVERDUE / due today" suffix for a due date.
     */
    private function dueLabel(?Carbon $dueDate, Carbon $today): string
    {
        if ($dueDate === null) {
            return '';
        }

        $label = $dueDate->lessThan($today->copy()->startOfDay()) ? 'OVERDUE' : 'due today';

        return "— {$label}: {$dueDate->toFormattedDateString()}";
    }

    /**
     * Resolve "today" in the notifiable's timezone.
     */
    private function today(object $notifiable): Carbon
    {
        $timezone = ($notifiable instanceof User ? $notifiable->timezone : null) ?: 'UTC';

        return Carbon::now($timezone);
    }
}

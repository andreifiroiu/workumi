<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Models\Task;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * Daily digest of a user's tasks that are due today or overdue.
 *
 * Sent once per day at the user's preferred local hour, listing only
 * actionable (non-completed) tasks assigned to them.
 */
class DailyTaskDigestNotification extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * @param  Collection<int, Task>  $tasks  The user's due/overdue tasks
     */
    public function __construct(
        private readonly Collection $tasks,
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
        $count = $this->tasks->count();

        $mailMessage = (new MailMessage)
            ->subject("You have {$count} ".str('task')->plural($count).' due')
            ->greeting('Hello '.($notifiable->name ?? 'there').',')
            ->line("Here are your tasks due on or before {$today->toFormattedDateString()}:");

        foreach ($this->tasks as $task) {
            $mailMessage->line($this->formatTaskLine($task, $today));
        }

        $mailMessage
            ->action('View Today', url('/today'))
            ->line('Stay on top of your work — knock these out today.');

        return $mailMessage;
    }

    /**
     * Build a single human-readable line describing a task.
     */
    private function formatTaskLine(Task $task, Carbon $today): string
    {
        $parts = ["**{$task->title}**"];

        $context = $task->workOrder?->title ?? $task->project?->name;
        if ($context !== null) {
            $parts[] = "({$context})";
        }

        if ($task->due_date !== null) {
            $isOverdue = $task->due_date->lessThan($today->copy()->startOfDay());
            $label = $isOverdue ? 'OVERDUE' : 'due today';
            $parts[] = "— {$label}: {$task->due_date->toFormattedDateString()}";
        }

        return implode(' ', $parts);
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

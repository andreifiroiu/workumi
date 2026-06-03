<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Enums\TaskStatus;
use App\Enums\WorkOrderStatus;
use App\Models\GlobalAISettings;
use App\Models\NotificationPreference;
use App\Models\Task;
use App\Models\User;
use App\Models\WorkOrder;
use App\Notifications\DailyTaskDigestNotification;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;

/**
 * Send each user a daily digest of their tasks and work orders that are due
 * today or overdue.
 *
 * Runs hourly. For every user, the email is sent only when the current time
 * in that user's own timezone matches their configured digest hour, and only
 * if their team has the daily task digest enabled. Users with no due/overdue
 * tasks or work orders are skipped.
 */
class SendDailyTaskDigestCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'notifications:daily-task-digest
        {--team= : Only process users belonging to a specific team}
        {--dry-run : Preview which users would receive a digest without sending}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Send users a daily email digest of their tasks and work orders due today or overdue';

    /**
     * Task statuses that are considered closed and excluded from the digest.
     *
     * @var array<int, string>
     */
    private const EXCLUDED_STATUSES = [
        TaskStatus::Done->value,
        TaskStatus::Cancelled->value,
        TaskStatus::Archived->value,
    ];

    /**
     * Work order statuses that are considered closed and excluded from the digest.
     *
     * @var array<int, string>
     */
    private const EXCLUDED_WORK_ORDER_STATUSES = [
        WorkOrderStatus::Delivered->value,
        WorkOrderStatus::Cancelled->value,
        WorkOrderStatus::Archived->value,
    ];

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $teamId = $this->option('team');
        $nowUtc = Carbon::now('UTC');

        $sent = 0;
        $skipped = 0;

        // chunkById (not cursor): we run writes inside the loop, which is unsafe
        // with an open unbuffered cursor on MySQL.
        User::query()
            ->whereNotNull('current_team_id')
            ->when($teamId !== null, fn ($query) => $query->where('current_team_id', $teamId))
            ->chunkById(200, function ($users) use ($nowUtc, $dryRun, &$sent, &$skipped) {
                foreach ($users as $user) {
                    $this->processUser($user, $nowUtc, $dryRun, $sent, $skipped);
                }
            });

        $summary = $dryRun
            ? "Dry run complete. Would send {$sent} digest(s)."
            : "Sent {$sent} digest(s).";
        $this->info($summary);

        Log::info('Daily task digest run completed', [
            'sent' => $sent,
            'skipped' => $skipped,
            'dry_run' => $dryRun,
        ]);

        return self::SUCCESS;
    }

    /**
     * Evaluate and, if appropriate, send the digest for a single user.
     */
    private function processUser(User $user, Carbon $nowUtc, bool $dryRun, int &$sent, int &$skipped): void
    {
        $timezone = $user->timezone ?: 'UTC';
        $localNow = $nowUtc->copy()->setTimezone($timezone);

        if ($localNow->hour !== (int) ($user->daily_digest_hour ?? 8)) {
            return;
        }

        $localDate = $localNow->toDateString();

        if (! $dryRun && optional($user->last_digest_sent_on)->toDateString() === $localDate) {
            $skipped++;

            return;
        }

        $team = $user->currentTeam;
        if ($team === null || ! GlobalAISettings::forTeam($team)->isDailyTaskDigestEnabled()) {
            $skipped++;

            return;
        }

        if (! NotificationPreference::forUser($team, $user)->email_daily_digest) {
            $skipped++;

            return;
        }

        $tasks = $this->dueTasksForUser($user, (int) $team->id, $localNow);
        $workOrders = $this->dueWorkOrdersForUser($user, (int) $team->id, $localNow);
        if ($tasks->isEmpty() && $workOrders->isEmpty()) {
            return;
        }

        $itemCount = $tasks->count() + $workOrders->count();

        if ($dryRun) {
            $this->line("Would send {$itemCount} item(s) to {$user->email}");
            $sent++;

            return;
        }

        $user->notify(new DailyTaskDigestNotification($tasks, $workOrders));
        $user->forceFill(['last_digest_sent_on' => $localDate])->save();

        $this->line("Sent {$itemCount} item(s) to {$user->email}");
        $sent++;
    }

    /**
     * Get a user's tasks that are due today or overdue in their timezone,
     * scoped to the team whose digest setting authorized this send.
     *
     * @return Collection<int, Task>
     */
    private function dueTasksForUser(User $user, int $teamId, Carbon $localNow): Collection
    {
        $endOfToday = $localNow->copy()->endOfDay()->setTimezone('UTC');

        return Task::query()
            ->where('team_id', $teamId)
            ->where('assigned_to_id', $user->id)
            ->whereNotNull('due_date')
            ->where('due_date', '<=', $endOfToday)
            ->whereNotIn('status', self::EXCLUDED_STATUSES)
            ->with(['workOrder:id,title', 'project:id,name'])
            ->orderBy('due_date')
            ->get();
    }

    /**
     * Get a user's work orders that are due today or overdue in their timezone,
     * scoped to the team whose digest setting authorized this send.
     *
     * @return Collection<int, WorkOrder>
     */
    private function dueWorkOrdersForUser(User $user, int $teamId, Carbon $localNow): Collection
    {
        $endOfToday = $localNow->copy()->endOfDay()->setTimezone('UTC');

        return WorkOrder::query()
            ->where('team_id', $teamId)
            ->where('assigned_to_id', $user->id)
            ->whereNotNull('due_date')
            ->where('due_date', '<=', $endOfToday)
            ->whereNotIn('status', self::EXCLUDED_WORK_ORDER_STATUSES)
            ->with(['project:id,name'])
            ->orderBy('due_date')
            ->get();
    }
}

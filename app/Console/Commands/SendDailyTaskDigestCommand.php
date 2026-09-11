<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Enums\DigestSkipReason;
use App\Enums\TaskStatus;
use App\Enums\WorkOrderStatus;
use App\Listeners\LogDigestDelivery;
use App\Models\GlobalAISettings;
use App\Models\NotificationPreference;
use App\Models\Task;
use App\Models\User;
use App\Models\WorkOrder;
use App\Notifications\DailyTaskDigestNotification;
use Illuminate\Console\Command;
use Illuminate\Support\Arr;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Throwable;

/**
 * Send each user a daily digest of their tasks and work orders that are due
 * today or overdue.
 *
 * Runs hourly. For every user, the email is sent only when the current time
 * in that user's own timezone matches their configured digest hour, and only
 * if their team has the daily task digest enabled. Users with no due/overdue
 * tasks or work orders are skipped.
 *
 * Every run writes a structured trail to the `digest` log channel: a start
 * record, one record per evaluated user (queued, or skipped with a reason),
 * and a summary naming every recipient. A shared `run_id` ties those records
 * together, and is carried into the queued notification so the delivery
 * records written by {@see LogDigestDelivery} join back to the
 * run that queued them.
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
        WorkOrderStatus::Backlog->value,
    ];

    /**
     * How many recipients the run summary names inline before truncating.
     *
     * The per-user "queued" records are the complete list; this only keeps one
     * summary line from growing unbounded on a large tenant.
     */
    private const SUMMARY_RECIPIENT_LIMIT = 100;

    /**
     * Identifier shared by every log record this run writes.
     */
    private string $runId;

    /**
     * Users evaluated so far this run.
     */
    private int $evaluated = 0;

    /**
     * Digests queued (or, on a dry run, that would have been queued).
     */
    private int $sent = 0;

    /**
     * Skip counts keyed by {@see DigestSkipReason} value.
     *
     * @var array<string, int>
     */
    private array $skipped = [];

    /**
     * Recipients queued this run, for the run summary.
     *
     * @var array<int, array{user_id: int, email: string, name: string|null, team_id: int, tasks: int, work_orders: int}>
     */
    private array $recipients = [];

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->runId = (string) Str::uuid();
        $dryRun = (bool) $this->option('dry-run');
        $teamId = $this->option('team');
        $nowUtc = Carbon::now('UTC');
        $startedAt = microtime(true);

        $this->log('info', 'Daily task digest run started', [
            'dry_run' => $dryRun,
            'team_filter' => $teamId,
            'now_utc' => $nowUtc->toIso8601String(),
        ]);

        // chunkById (not cursor): we run writes inside the loop, which is unsafe
        // with an open unbuffered cursor on MySQL.
        User::query()
            ->whereNotNull('current_team_id')
            ->when($teamId !== null, fn ($query) => $query->where('current_team_id', $teamId))
            ->chunkById(200, function ($users) use ($nowUtc, $dryRun) {
                foreach ($users as $user) {
                    $this->evaluated++;
                    $this->processUser($user, $nowUtc, $dryRun);
                }
            });

        $summary = $dryRun
            ? "Dry run complete. Would send {$this->sent} digest(s)."
            : "Sent {$this->sent} digest(s).";
        $this->info($summary);

        $failures = ($this->skipped[DigestSkipReason::SendFailed->value] ?? 0)
            + ($this->skipped[DigestSkipReason::MarkerWriteFailed->value] ?? 0);

        // `not_in_digest_hour` is reported apart from `skipped` so that "skipped"
        // means "was a candidate this hour and still didn't get one" — otherwise
        // the metric is swamped by the 23/24 of users who were never candidates.
        $outsideHour = $this->skipped[DigestSkipReason::OutsideDigestHour->value] ?? 0;
        $candidateSkips = Arr::except($this->skipped, [DigestSkipReason::OutsideDigestHour->value]);

        $this->log('info', 'Daily task digest run completed', [
            'dry_run' => $dryRun,
            'team_filter' => $teamId,
            'evaluated' => $this->evaluated,
            'sent' => $this->sent,
            'failed' => $failures,
            'not_in_digest_hour' => $outsideHour,
            'skipped' => array_sum($candidateSkips),
            'skipped_by_reason' => $candidateSkips,
            'recipient_emails' => array_column($this->recipients, 'email'),
            'recipients_truncated' => $this->sent > count($this->recipients),
            'duration_ms' => (int) round((microtime(true) - $startedAt) * 1000),
        ]);

        if ($failures > 0) {
            $this->error("{$failures} digest(s) failed. See the digest log for details.");

            return self::FAILURE;
        }

        return self::SUCCESS;
    }

    /**
     * Evaluate and, if appropriate, send the digest for a single user.
     */
    private function processUser(User $user, Carbon $nowUtc, bool $dryRun): void
    {
        $timezone = $user->timezone ?: 'UTC';
        $localNow = $nowUtc->copy()->setTimezone($timezone);
        $digestHour = (int) ($user->daily_digest_hour ?? 8);

        $context = [
            'user_id' => $user->id,
            'email' => $user->email,
            'name' => $user->name,
            'team_id' => $user->current_team_id,
            'timezone' => $timezone,
            'local_time' => $localNow->toIso8601String(),
            'digest_hour' => $digestHour,
        ];

        if ($localNow->hour !== $digestHour) {
            // Debug level: every user misses on 23 of the 24 hourly runs, so
            // this is the one skip that would otherwise flood the log.
            $this->skip(DigestSkipReason::OutsideDigestHour, $context, 'debug');

            return;
        }

        $localDate = $localNow->toDateString();
        $context['local_date'] = $localDate;

        if (! $dryRun && optional($user->last_digest_sent_on)->toDateString() === $localDate) {
            $this->skip(DigestSkipReason::AlreadySentToday, $context + [
                'last_digest_sent_on' => $localDate,
            ]);

            return;
        }

        $team = $user->currentTeam;
        if ($team === null) {
            $this->skip(DigestSkipReason::NoCurrentTeam, $context);

            return;
        }

        if (! GlobalAISettings::forTeam($team)->isDailyTaskDigestEnabled()) {
            $this->skip(DigestSkipReason::TeamDigestDisabled, $context + [
                'team_name' => $team->name,
            ]);

            return;
        }

        if (! NotificationPreference::forUser($team, $user)->email_daily_digest) {
            $this->skip(DigestSkipReason::UserPreferenceOff, $context);

            return;
        }

        $tasks = $this->dueTasksForUser($user, (int) $team->id, $localNow);
        $workOrders = $this->dueWorkOrdersForUser($user, (int) $team->id, $localNow);

        $context += [
            'task_count' => $tasks->count(),
            'work_order_count' => $workOrders->count(),
            'task_ids' => $tasks->pluck('id')->all(),
            'work_order_ids' => $workOrders->pluck('id')->all(),
        ];

        if ($tasks->isEmpty() && $workOrders->isEmpty()) {
            $this->skip(DigestSkipReason::NothingDue, $context);

            return;
        }

        $itemCount = $tasks->count() + $workOrders->count();

        if ($dryRun) {
            $this->line("Would send {$itemCount} item(s) to {$user->email}");
            $this->recordRecipient($user, $tasks->count(), $workOrders->count());
            $this->log('info', 'Daily task digest would be sent (dry run)', $context);

            return;
        }

        try {
            $user->notify(new DailyTaskDigestNotification($tasks, $workOrders, $this->runId));
        } catch (Throwable $exception) {
            $this->error("Failed to queue digest for {$user->email}: {$exception->getMessage()}");
            $this->skip(DigestSkipReason::SendFailed, $context + [
                'exception_class' => $exception::class,
                'exception' => $exception->getMessage(),
            ], 'error');

            return;
        }

        // The digest is on the queue from here on, so the user counts as a
        // recipient even if the dedupe marker below fails to persist. Recording
        // the marker failure separately keeps the run summary honest instead of
        // reporting a mail that is already in flight as "not sent".
        $this->line("Sent {$itemCount} item(s) to {$user->email}");
        $this->recordRecipient($user, $tasks->count(), $workOrders->count());

        try {
            $user->forceFill(['last_digest_sent_on' => $localDate])->save();
        } catch (Throwable $exception) {
            $this->error("Queued digest for {$user->email} but could not mark it sent: {$exception->getMessage()}");
            $this->skip(DigestSkipReason::MarkerWriteFailed, $context + [
                'exception_class' => $exception::class,
                'exception' => $exception->getMessage(),
            ], 'error');

            return;
        }

        $this->log('info', 'Daily task digest queued', $context);
    }

    /**
     * Record and log that a user was passed over, tallying the reason for the
     * run summary. The caller's `$context` already identifies the user.
     *
     * @param  array<string, mixed>  $context
     */
    private function skip(DigestSkipReason $reason, array $context, string $level = 'info'): void
    {
        $this->skipped[$reason->value] = ($this->skipped[$reason->value] ?? 0) + 1;

        $this->log($level, 'Daily task digest skipped', $context + [
            'skip_reason' => $reason->value,
            'skip_reason_label' => $reason->label(),
        ]);
    }

    /**
     * Remember a recipient so the run summary can name everyone who was mailed.
     */
    private function recordRecipient(User $user, int $taskCount, int $workOrderCount): void
    {
        $this->sent++;

        if (count($this->recipients) >= self::SUMMARY_RECIPIENT_LIMIT) {
            return;
        }

        $this->recipients[] = [
            'user_id' => (int) $user->id,
            'email' => (string) $user->email,
            'name' => $user->name,
            'team_id' => (int) $user->current_team_id,
            'tasks' => $taskCount,
            'work_orders' => $workOrderCount,
        ];
    }

    /**
     * Write a record to the digest log channel, stamped with this run's id.
     *
     * @param  array<string, mixed>  $context
     */
    private function log(string $level, string $message, array $context): void
    {
        try {
            Log::channel('digest')->log($level, $message, ['run_id' => $this->runId] + $context);
        } catch (Throwable $exception) {
            // A broken log channel must not stop digests going out; losing a
            // record is survivable, losing the run is not.
            error_log("Daily task digest logging failed: {$exception->getMessage()}");
        }
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

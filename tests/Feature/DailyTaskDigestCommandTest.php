<?php

declare(strict_types=1);

use App\Enums\TaskStatus;
use App\Enums\WorkOrderStatus;
use App\Models\GlobalAISettings;
use App\Models\NotificationPreference;
use App\Models\Party;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use App\Models\WorkOrder;
use App\Notifications\DailyTaskDigestNotification;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Notification;

beforeEach(function () {
    Notification::fake();

    $this->owner = User::factory()->create([
        'timezone' => 'America/New_York',
        'daily_digest_hour' => 8,
    ]);
    $this->team = $this->owner->createTeam(['name' => 'Digest Team']);
    $this->owner->current_team_id = $this->team->id;
    $this->owner->save();

    GlobalAISettings::forTeam($this->team)->update(['daily_task_digest_enabled' => true]);

    $this->party = Party::factory()->create(['team_id' => $this->team->id]);
    $this->project = Project::factory()->create([
        'team_id' => $this->team->id,
        'party_id' => $this->party->id,
        'owner_id' => $this->owner->id,
    ]);
    $this->workOrder = WorkOrder::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
        'created_by_id' => $this->owner->id,
        'accountable_id' => $this->owner->id,
    ]);
});

/**
 * Create a task due today (in New York) assigned to the owner.
 */
function dueTask(array $overrides = []): Task
{
    return Task::factory()->todo()->create(array_merge([
        'team_id' => test()->team->id,
        'work_order_id' => test()->workOrder->id,
        'project_id' => test()->project->id,
        'assigned_to_id' => test()->owner->id,
        'due_date' => Carbon::now('America/New_York')->toDateString(),
    ], $overrides));
}

/**
 * Create a work order due today (in New York) assigned to the owner.
 */
function dueWorkOrder(array $overrides = []): WorkOrder
{
    return WorkOrder::factory()->create(array_merge([
        'team_id' => test()->team->id,
        'project_id' => test()->project->id,
        'created_by_id' => test()->owner->id,
        'accountable_id' => test()->owner->id,
        'assigned_to_id' => test()->owner->id,
        'status' => WorkOrderStatus::Active,
        'due_date' => Carbon::now('America/New_York')->toDateString(),
    ], $overrides));
}

/**
 * Freeze "now" to the UTC instant matching the given local hour in New York,
 * on the current date. Anchored to the real date (and DST offset) so the due
 * dates created by the helpers above — which are relative to "now" — always
 * line up with the frozen clock.
 */
function freezeAtNewYorkHour(int $hour): void
{
    Carbon::setTestNow(
        Carbon::now('America/New_York')->setTime($hour, 0, 0)->setTimezone('UTC')
    );
}

afterEach(function () {
    Carbon::setTestNow();
});

test('sends digest at the user local digest hour', function () {
    dueTask();
    freezeAtNewYorkHour(8);

    $this->artisan('notifications:daily-task-digest')->assertSuccessful();

    Notification::assertSentTo($this->owner, DailyTaskDigestNotification::class);
});

test('does not send outside the user local digest hour', function () {
    dueTask();
    freezeAtNewYorkHour(9);

    $this->artisan('notifications:daily-task-digest')->assertSuccessful();

    Notification::assertNothingSent();
});

test('does not send when the user has no due or overdue tasks', function () {
    Task::factory()->todo()->create([
        'team_id' => $this->team->id,
        'work_order_id' => $this->workOrder->id,
        'project_id' => $this->project->id,
        'assigned_to_id' => $this->owner->id,
        'due_date' => Carbon::now('America/New_York')->addDays(5)->toDateString(),
    ]);
    freezeAtNewYorkHour(8);

    $this->artisan('notifications:daily-task-digest')->assertSuccessful();

    Notification::assertNothingSent();
});

test('excludes done cancelled and archived tasks but includes overdue', function () {
    dueTask(['status' => TaskStatus::Done, 'due_date' => Carbon::now('America/New_York')->subDay()->toDateString()]);
    dueTask(['status' => TaskStatus::Cancelled]);
    dueTask(['status' => TaskStatus::Archived]);
    $overdue = dueTask(['due_date' => Carbon::now('America/New_York')->subDays(2)->toDateString()]);

    freezeAtNewYorkHour(8);

    $this->artisan('notifications:daily-task-digest')->assertSuccessful();

    Notification::assertSentTo($this->owner, DailyTaskDigestNotification::class, function ($notification) use ($overdue) {
        $mail = $notification->toMail($this->owner);
        $body = collect($mail->introLines)->implode("\n");

        return str_contains($body, $overdue->title);
    });
});

test('sends digest for work orders due today or overdue', function () {
    $workOrder = dueWorkOrder();
    freezeAtNewYorkHour(8);

    $this->artisan('notifications:daily-task-digest')->assertSuccessful();

    Notification::assertSentTo($this->owner, DailyTaskDigestNotification::class, function ($notification) use ($workOrder) {
        $body = collect($notification->toMail($this->owner)->introLines)->implode("\n");

        return str_contains($body, $workOrder->title);
    });
});

test('excludes delivered cancelled and archived work orders but includes overdue', function () {
    $delivered = dueWorkOrder(['status' => WorkOrderStatus::Delivered]);
    dueWorkOrder(['status' => WorkOrderStatus::Cancelled]);
    dueWorkOrder(['status' => WorkOrderStatus::Archived]);
    $overdue = dueWorkOrder([
        'status' => WorkOrderStatus::Active,
        'due_date' => Carbon::now('America/New_York')->subDays(2)->toDateString(),
    ]);

    freezeAtNewYorkHour(8);

    $this->artisan('notifications:daily-task-digest')->assertSuccessful();

    Notification::assertSentTo($this->owner, DailyTaskDigestNotification::class, function ($notification) use ($overdue, $delivered) {
        $body = collect($notification->toMail($this->owner)->introLines)->implode("\n");

        return str_contains($body, $overdue->title) && ! str_contains($body, $delivered->title);
    });
});

test('digest lines link to the task and work order detail pages', function () {
    $task = dueTask();
    $workOrder = dueWorkOrder();
    freezeAtNewYorkHour(8);

    $this->artisan('notifications:daily-task-digest')->assertSuccessful();

    Notification::assertSentTo($this->owner, DailyTaskDigestNotification::class, function ($notification) use ($task, $workOrder) {
        $body = collect($notification->toMail($this->owner)->introLines)->implode("\n");

        return str_contains($body, route('tasks.show', $task))
            && str_contains($body, route('work-orders.show', $workOrder));
    });
});

test('does not send when the user has disabled the daily digest email preference', function () {
    NotificationPreference::forUser($this->team, $this->owner)->update(['email_daily_digest' => false]);
    dueTask();
    freezeAtNewYorkHour(8);

    $this->artisan('notifications:daily-task-digest')->assertSuccessful();

    Notification::assertNothingSent();
});

test('does not send when the team toggle is disabled', function () {
    GlobalAISettings::forTeam($this->team)->update(['daily_task_digest_enabled' => false]);
    dueTask();
    freezeAtNewYorkHour(8);

    $this->artisan('notifications:daily-task-digest')->assertSuccessful();

    Notification::assertNothingSent();
});

test('does not send twice in the same local day', function () {
    dueTask();
    freezeAtNewYorkHour(8);

    $this->artisan('notifications:daily-task-digest')->assertSuccessful();
    $this->artisan('notifications:daily-task-digest')->assertSuccessful();

    Notification::assertSentToTimes($this->owner, DailyTaskDigestNotification::class, 1);
});

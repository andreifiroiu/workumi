<?php

declare(strict_types=1);

use App\Enums\DigestSkipReason;
use App\Listeners\LogDigestDelivery;
use App\Models\GlobalAISettings;
use App\Models\NotificationPreference;
use App\Models\Party;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use App\Notifications\DailyTaskDigestNotification;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Mail\SentMessage;
use Illuminate\Notifications\Events\NotificationFailed;
use Illuminate\Notifications\Events\NotificationSent;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;
use Monolog\Handler\TestHandler;
use Symfony\Component\Mailer\Envelope;
use Symfony\Component\Mime\Address;
use Symfony\Component\Mime\Email;

beforeEach(function () {
    Notification::fake();

    $this->owner = User::factory()->create([
        'timezone' => 'America/New_York',
        'daily_digest_hour' => 8,
    ]);
    $this->team = $this->owner->createTeam(['name' => 'Digest Log Team']);
    $this->owner->current_team_id = $this->team->id;
    $this->owner->save();

    GlobalAISettings::forTeam($this->team)->update(['daily_task_digest_enabled' => true]);

    $this->digestLog = captureDigestLog();
});

afterEach(function () {
    Carbon::setTestNow();
});

/**
 * Swap the digest channel for an in-memory handler so assertions can read the
 * records the command wrote without touching storage/logs.
 */
function captureDigestLog(): TestHandler
{
    config()->set('logging.channels.digest', [
        'driver' => 'monolog',
        'handler' => TestHandler::class,
    ]);
    Log::forgetChannel('digest');

    /** @var TestHandler $handler */
    $handler = Log::channel('digest')->getLogger()->getHandlers()[0];

    return $handler;
}

/**
 * Find the first digest log record with the given message.
 *
 * @return array<string, mixed>|null
 */
function digestRecord(TestHandler $handler, string $message): ?array
{
    foreach ($handler->getRecords() as $record) {
        if ($record['message'] === $message) {
            return $record['context'];
        }
    }

    return null;
}

/**
 * Create a task due today (in New York) assigned to the owner.
 */
function loggedDueTask(): Task
{
    $project = Project::factory()->create([
        'team_id' => test()->team->id,
        'party_id' => Party::factory()->create(['team_id' => test()->team->id])->id,
        'owner_id' => test()->owner->id,
    ]);

    return Task::factory()->todo()->create([
        'team_id' => test()->team->id,
        'project_id' => $project->id,
        'assigned_to_id' => test()->owner->id,
        'due_date' => Carbon::now('America/New_York')->toDateString(),
    ]);
}

function freezeAtHour(int $hour): void
{
    Carbon::setTestNow(
        Carbon::now('America/New_York')->setTime($hour, 0)->setTimezone('UTC')
    );
}

test('logs the start and completion of a digest run with the recipients named', function () {
    $task = loggedDueTask();
    freezeAtHour(8);

    $this->artisan('notifications:daily-task-digest')->assertSuccessful();

    $start = digestRecord($this->digestLog, 'Daily task digest run started');
    expect($start)->not->toBeNull()
        ->and($start['run_id'])->toBeString()
        ->and($start['dry_run'])->toBeFalse();

    $completed = digestRecord($this->digestLog, 'Daily task digest run completed');
    expect($completed)->not->toBeNull()
        ->and($completed['run_id'])->toBe($start['run_id'])
        ->and($completed['sent'])->toBe(1)
        ->and($completed['evaluated'])->toBeGreaterThanOrEqual(1)
        ->and($completed['failed'])->toBe(0)
        ->and($completed['recipient_emails'])->toBe([$this->owner->email])
        ->and($completed['recipients_truncated'])->toBeFalse();
});

test('logs each queued digest with the recipient and the items it contains', function () {
    $task = loggedDueTask();
    freezeAtHour(8);

    $this->artisan('notifications:daily-task-digest')->assertSuccessful();

    $queued = digestRecord($this->digestLog, 'Daily task digest queued');
    expect($queued)->not->toBeNull()
        ->and($queued['user_id'])->toBe($this->owner->id)
        ->and($queued['email'])->toBe($this->owner->email)
        ->and($queued['timezone'])->toBe('America/New_York')
        ->and($queued['digest_hour'])->toBe(8)
        ->and($queued['task_count'])->toBe(1)
        ->and($queued['task_ids'])->toContain($task->id);
});

test('logs a skip reason when the user turned the digest email off', function () {
    loggedDueTask();
    NotificationPreference::forUser($this->team, $this->owner)->update(['email_daily_digest' => false]);
    freezeAtHour(8);

    $this->artisan('notifications:daily-task-digest')->assertSuccessful();

    $skipped = digestRecord($this->digestLog, 'Daily task digest skipped');
    expect($skipped['skip_reason'])->toBe(DigestSkipReason::UserPreferenceOff->value)
        ->and($skipped['email'])->toBe($this->owner->email);

    $completed = digestRecord($this->digestLog, 'Daily task digest run completed');
    expect($completed['skipped_by_reason'])
        ->toHaveKey(DigestSkipReason::UserPreferenceOff->value)
        ->and($completed['recipient_emails'])->toBeEmpty();
});

test('logs a skip reason when the user has nothing due', function () {
    freezeAtHour(8);

    $this->artisan('notifications:daily-task-digest')->assertSuccessful();

    $completed = digestRecord($this->digestLog, 'Daily task digest run completed');
    expect($completed['skipped_by_reason'])->toHaveKey(DigestSkipReason::NothingDue->value);
});

test('logs a skip reason when the team toggle is off', function () {
    loggedDueTask();
    GlobalAISettings::forTeam($this->team)->update(['daily_task_digest_enabled' => false]);
    freezeAtHour(8);

    $this->artisan('notifications:daily-task-digest')->assertSuccessful();

    $skipped = digestRecord($this->digestLog, 'Daily task digest skipped');
    expect($skipped['skip_reason'])->toBe(DigestSkipReason::TeamDigestDisabled->value);
});

test('logs a skip reason when a digest was already sent today', function () {
    loggedDueTask();
    freezeAtHour(8);

    $this->artisan('notifications:daily-task-digest')->assertSuccessful();
    $this->artisan('notifications:daily-task-digest')->assertSuccessful();

    expect(collect($this->digestLog->getRecords())
        ->pluck('context.skip_reason')
        ->filter()
        ->all()
    )->toContain(DigestSkipReason::AlreadySentToday->value);
});

test('logs would-be recipients on a dry run without sending', function () {
    loggedDueTask();
    freezeAtHour(8);

    $this->artisan('notifications:daily-task-digest', ['--dry-run' => true])->assertSuccessful();

    Notification::assertNothingSent();

    $dryRun = digestRecord($this->digestLog, 'Daily task digest would be sent (dry run)');
    expect($dryRun['email'])->toBe($this->owner->email);

    $completed = digestRecord($this->digestLog, 'Daily task digest run completed');
    expect($completed['dry_run'])->toBeTrue()
        ->and($completed['recipient_emails'])->toContain($this->owner->email);
});

test('logs actual delivery once the mailer accepts the digest', function () {
    $notification = new DailyTaskDigestNotification(collect([]), collect([]), 'run-123');

    (new LogDigestDelivery)->recordSent(
        new NotificationSent($this->owner, $notification, 'mail', null)
    );

    $delivered = digestRecord($this->digestLog, 'Daily task digest accepted by mail transport');
    expect($delivered)->not->toBeNull()
        ->and($delivered['run_id'])->toBe('run-123')
        ->and($delivered['email'])->toBe($this->owner->email)
        ->and($delivered['user_id'])->toBe($this->owner->id)
        ->and($delivered['channel'])->toBe('mail');
});

test('logs a failed digest delivery as an error', function () {
    $notification = new DailyTaskDigestNotification(collect([]), collect([]), 'run-456');

    (new LogDigestDelivery)->recordFailed(
        new NotificationFailed($this->owner, $notification, 'mail', ['message' => 'mailbox unavailable'])
    );

    expect(digestRecord($this->digestLog, 'Daily task digest delivery failed'))
        ->not->toBeNull();

    expect($this->digestLog->hasErrorRecords())->toBeTrue();
});

test('the registered listener logs a dispatched delivery exactly once', function () {
    // Regression: this app has event auto-discovery on, which binds any public
    // `handle*` method to its first parameter's event. A listener method named
    // `recordSent` would be bound twice — once by discovery, once by the explicit
    // registration in AppServiceProvider — and log every delivery twice.
    event(new NotificationSent(
        $this->owner,
        new DailyTaskDigestNotification(collect([]), collect([]), 'run-789'),
        'mail',
        null
    ));

    $delivered = collect($this->digestLog->getRecords())
        ->filter(fn ($record) => $record['message'] === 'Daily task digest accepted by mail transport');

    expect($delivered)->toHaveCount(1)
        ->and($delivered->first()['context']['run_id'])->toBe('run-789');
});

test('every channel the digest stack can name is defined and buildable', function () {
    // Regression: env() coerces the *string* "null" to PHP null, so the channel
    // resolved to no driver at all and Laravel silently demoted every digest
    // record to the emergency logger -- stack traces in laravel.log, nothing in
    // digest.log. Nothing in the suite noticed, because every other test here
    // replaces the channel, so this one reads the shipped config file directly.
    $shipped = require config_path('logging.php');

    // The env var is set for the test run, so also pin the default baked into
    // the config file -- otherwise a typo there ships untested.
    preg_match("/env\('LOG_DIGEST_STACK', '([^']+)'\)/", file_get_contents(config_path('logging.php')), $matches);
    expect($matches[1] ?? null)->not->toBeNull('Could not find the LOG_DIGEST_STACK default in config/logging.php.');

    $names = array_unique([...$shipped['channels']['digest']['channels'], ...explode(',', $matches[1])]);

    expect($names)->not->toBeEmpty();

    foreach ($names as $channel) {
        expect($shipped['channels'][$channel] ?? null)->not->toBeNull(
            "The digest stack names channel [{$channel}], which config/logging.php does not define."
        );

        // Log::build() resolves without the emergency-logger fallback that
        // Log::channel() applies, so a broken driver surfaces as a throw.
        expect(fn () => Log::build($shipped['channels'][$channel]))
            ->not->toThrow(Exception::class);
    }
});

test('the digest log context survives a queue round trip', function () {
    // The notification is ShouldQueue, so in production NotificationSent fires
    // in the worker against an unserialized instance. Assert the run id and the
    // model collections still describe the digest after that round trip.
    $task = loggedDueTask();

    $notification = new DailyTaskDigestNotification(
        Task::whereKey($task->id)->get(),
        collect([]),
        'run-round-trip'
    );

    /** @var DailyTaskDigestNotification $revived */
    $revived = unserialize(serialize($notification));

    expect($revived->logContext())->toMatchArray([
        'run_id' => 'run-round-trip',
        'task_count' => 1,
        'work_order_count' => 0,
        'task_ids' => [$task->id],
    ]);
});

test('a broken digest log channel does not break delivery or the run', function () {
    // The listener runs inline after the transport accepted the message. If it
    // threw, the queue job would fail and a worker with retries would send the
    // digest a second time -- so a logging failure must stay swallowed.
    config()->set('logging.channels.digest', ['driver' => 'does-not-exist']);
    Log::forgetChannel('digest');

    $listener = new LogDigestDelivery;

    expect(fn () => $listener->recordSent(new NotificationSent(
        $this->owner,
        new DailyTaskDigestNotification(collect([]), collect([]), 'run-broken'),
        'mail',
        null
    )))->not->toThrow(Exception::class);

    loggedDueTask();
    freezeAtHour(8);

    $this->artisan('notifications:daily-task-digest')->assertSuccessful();

    Notification::assertSentTo($this->owner, DailyTaskDigestNotification::class);
});

test('the run exits with a failure code when a digest could not be queued', function () {
    loggedDueTask();
    freezeAtHour(8);

    // A run where sends blew up must not report green to the scheduler.
    Notification::shouldReceive('send')->andThrow(new RuntimeException('smtp is down'));

    $this->artisan('notifications:daily-task-digest')->assertFailed();

    $skipped = digestRecord($this->digestLog, 'Daily task digest skipped');
    expect($skipped['skip_reason'])->toBe(DigestSkipReason::SendFailed->value)
        ->and($skipped['exception'])->toBe('smtp is down')
        ->and($skipped['exception_class'])->toBe(RuntimeException::class);

    $completed = digestRecord($this->digestLog, 'Daily task digest run completed');
    expect($completed['failed'])->toBe(1)
        ->and($completed['sent'])->toBe(0);
});

test('the run summary separates users who were never candidates from real skips', function () {
    loggedDueTask();
    freezeAtHour(9);

    $this->artisan('notifications:daily-task-digest')->assertSuccessful();

    $completed = digestRecord($this->digestLog, 'Daily task digest run completed');
    expect($completed['not_in_digest_hour'])->toBe(1)
        ->and($completed['skipped'])->toBe(0)
        ->and($completed['skipped_by_reason'])
        ->not->toHaveKey(DigestSkipReason::OutsideDigestHour->value);
});

test('a failed sent-today marker still counts the user as a recipient', function () {
    // The digest is already on the queue at that point; reporting it as unsent
    // would make the run summary lie about a mail that is in flight.
    loggedDueTask();
    freezeAtHour(8);

    User::saving(fn () => throw new RuntimeException('deadlock'));

    $this->artisan('notifications:daily-task-digest')->assertFailed();

    Notification::assertSentTo($this->owner, DailyTaskDigestNotification::class);

    $completed = digestRecord($this->digestLog, 'Daily task digest run completed');
    expect($completed['sent'])->toBe(1)
        ->and($completed['failed'])->toBe(1)
        ->and($completed['recipient_emails'])->toContain($this->owner->email)
        ->and($completed['skipped_by_reason'])
        ->toHaveKey(DigestSkipReason::MarkerWriteFailed->value);
});

test('records the mail transport message id when the mailer supplies one', function () {
    $symfony = new Symfony\Component\Mailer\SentMessage(
        (new Email)->from('a@b.test')->to('c@d.test')->text('hi'),
        new Envelope(
            new Address('a@b.test'),
            [new Address('c@d.test')]
        )
    );

    (new LogDigestDelivery)->recordSent(new NotificationSent(
        $this->owner,
        new DailyTaskDigestNotification(collect([]), collect([]), 'run-msg-id'),
        'mail',
        new SentMessage($symfony)
    ));

    $delivered = digestRecord($this->digestLog, 'Daily task digest accepted by mail transport');
    expect($delivered['message_id'])->toBe($symfony->getMessageId())
        ->and($delivered['message_id'])->not->toBeEmpty()
        ->and($delivered['mailer'])->toBe(config('mail.default'));
});

test('a failed delivery logs the exception class and message but not the object', function () {
    (new LogDigestDelivery)->recordFailed(new NotificationFailed(
        $this->owner,
        new DailyTaskDigestNotification(collect([]), collect([]), 'run-fail'),
        'mail',
        ['exception' => new RuntimeException('mailbox unavailable')]
    ));

    $failed = digestRecord($this->digestLog, 'Daily task digest delivery failed');
    expect($failed['exception'])->toBe('mailbox unavailable')
        ->and($failed['exception_class'])->toBe(RuntimeException::class)
        ->and($failed)->not->toHaveKey('data');
});

test('ignores notifications that are not the daily digest', function () {
    (new LogDigestDelivery)->recordSent(
        new NotificationSent($this->owner, new VerifyEmail, 'mail', null)
    );

    expect($this->digestLog->getRecords())->toBeEmpty();
});

<?php

declare(strict_types=1);

namespace App\Listeners;

use App\Models\User;
use App\Notifications\DailyTaskDigestNotification;
use App\Providers\AppServiceProvider;
use Illuminate\Mail\SentMessage;
use Illuminate\Notifications\Events\NotificationFailed;
use Illuminate\Notifications\Events\NotificationSent;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Record the real outcome of every daily digest email on the `digest` channel.
 *
 * The command only queues the notification, so its "queued" record cannot
 * prove anything was mailed. These events fire in the queue worker once the
 * mailer has accepted (or rejected) the message, which is what actually
 * answers "was it sent, and to whom?". Each record carries the `run_id` of
 * the command run that queued it.
 *
 * Two deliberate constraints:
 *
 * - Every body is wrapped so a logging failure can never propagate. These
 *   events are dispatched inline after the transport has already accepted the
 *   message, so an exception here would fail the queue job and — on a worker
 *   with retries — deliver the digest a second time. An observer must not be
 *   able to break what it observes.
 * - The methods avoid a `handle` prefix: this app has event auto-discovery on,
 *   which binds any public `handle*` method to the event its first parameter
 *   names. Combined with the explicit registration in
 *   {@see AppServiceProvider}, that would log every delivery twice.
 */
class LogDigestDelivery
{
    /**
     * Log a digest that the mail transport accepted.
     */
    public function recordSent(NotificationSent $event): void
    {
        if (! $event->notification instanceof DailyTaskDigestNotification) {
            return;
        }

        $this->write(
            'info',
            'Daily task digest accepted by mail transport',
            $this->context($event->notifiable, $event->notification) + [
                'channel' => $event->channel,
                'mailer' => config('mail.default'),
                'message_id' => $this->messageId($event->response),
            ]
        );
    }

    /**
     * Log a digest the mail transport rejected.
     */
    public function recordFailed(NotificationFailed $event): void
    {
        if (! $event->notification instanceof DailyTaskDigestNotification) {
            return;
        }

        $this->write(
            'error',
            'Daily task digest delivery failed',
            $this->context($event->notifiable, $event->notification) + [
                'channel' => $event->channel,
                'mailer' => config('mail.default'),
            ] + $this->failureContext($event->data)
        );
    }

    /**
     * Build the shared context identifying the recipient and the digest's contents.
     *
     * @return array<string, mixed>
     */
    private function context(object $notifiable, DailyTaskDigestNotification $notification): array
    {
        return $notification->logContext() + [
            'user_id' => $notifiable instanceof User ? $notifiable->id : null,
            'email' => $notifiable instanceof User ? $notifiable->email : null,
            'name' => $notifiable instanceof User ? $notifiable->name : null,
            'team_id' => $notifiable instanceof User ? $notifiable->current_team_id : null,
        ];
    }

    /**
     * Reduce the failure payload to the class and message.
     *
     * The raw payload holds the Throwable itself, whose normalized trace can
     * carry transport credentials into a log file that is retained for weeks
     * and already holds recipient names and addresses.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function failureContext(array $data): array
    {
        $exception = $data['exception'] ?? null;

        if (! $exception instanceof Throwable) {
            return [];
        }

        return [
            'exception_class' => $exception::class,
            'exception' => $exception->getMessage(),
        ];
    }

    /**
     * Pull the transport's message id out of the mail channel's response.
     *
     * Illuminate's SentMessage only forwards getMessageId() to the Symfony
     * message through __call(), which method_exists() cannot see — so unwrap it.
     */
    private function messageId(mixed $response): ?string
    {
        if ($response instanceof SentMessage) {
            return $response->getSymfonySentMessage()->getMessageId();
        }

        if (is_object($response) && is_callable([$response, 'getMessageId'])) {
            return $response->getMessageId();
        }

        return null;
    }

    /**
     * Write to the digest channel, swallowing any logging failure.
     *
     * @param  array<string, mixed>  $context
     */
    private function write(string $level, string $message, array $context): void
    {
        try {
            Log::channel('digest')->log($level, $message, $context);
        } catch (Throwable $exception) {
            error_log("Daily task digest delivery logging failed: {$exception->getMessage()}");
        }
    }
}

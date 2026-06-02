<?php

declare(strict_types=1);

use App\Jobs\ProcessInboundEmail;
use Illuminate\Support\Facades\Queue;

beforeEach(function () {
    config(['services.mailgun.webhook_signing_key' => 'test-signing-key']);
});

/**
 * Build a valid signed Mailgun inbound payload.
 */
function signedPayload(array $overrides = []): array
{
    $timestamp = (string) time();
    $token = 'token-abc-123';
    $signature = hash_hmac('sha256', $timestamp.$token, 'test-signing-key');

    return array_merge([
        'timestamp' => $timestamp,
        'token' => $token,
        'signature' => $signature,
        'sender' => 'sender@example.com',
        'subject' => 'New request',
        'stripped-text' => 'Please build a landing page.',
        'Message-Id' => '<abc@example.com>',
    ], $overrides);
}

test('accepts a validly signed webhook and queues processing', function () {
    Queue::fake();

    $payload = signedPayload();

    $this->postJson('/webhooks/mailgun/inbound', $payload)
        ->assertOk()
        ->assertJson(['status' => 'queued']);

    Queue::assertPushed(ProcessInboundEmail::class, function (ProcessInboundEmail $job) {
        return $job->email['from'] === 'sender@example.com'
            && $job->email['body'] === 'Please build a landing page.'
            && $job->email['subject'] === 'New request';
    });
});

test('rejects a replayed webhook with a reused token', function () {
    Queue::fake();

    $payload = signedPayload();

    $this->postJson('/webhooks/mailgun/inbound', $payload)->assertOk();
    $this->postJson('/webhooks/mailgun/inbound', $payload)->assertForbidden();

    Queue::assertPushed(ProcessInboundEmail::class, 1);
});

test('rejects a webhook with an invalid signature', function () {
    Queue::fake();

    $this->postJson('/webhooks/mailgun/inbound', signedPayload(['signature' => 'wrong']))
        ->assertForbidden();

    Queue::assertNothingPushed();
});

test('rejects a webhook with a stale timestamp', function () {
    Queue::fake();

    $timestamp = (string) (time() - 1000);
    $token = 'token-abc-123';
    $signature = hash_hmac('sha256', $timestamp.$token, 'test-signing-key');

    $this->postJson('/webhooks/mailgun/inbound', signedPayload([
        'timestamp' => $timestamp,
        'signature' => $signature,
    ]))->assertForbidden();

    Queue::assertNothingPushed();
});

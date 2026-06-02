<?php

declare(strict_types=1);

namespace App\Http\Controllers\Webhooks;

use App\Http\Controllers\Controller;
use App\Jobs\ProcessInboundEmail;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Receives inbound emails forwarded by a Mailgun inbound route.
 *
 * The request signature is validated by the VerifyMailgunSignature middleware.
 * This handler stays thin: it normalizes the payload and queues processing,
 * returning 200 immediately so Mailgun does not retry.
 */
class MailgunInboundController extends Controller
{
    /**
     * Handle an inbound email webhook.
     */
    public function handle(Request $request): JsonResponse
    {
        ProcessInboundEmail::dispatch([
            'from' => $request->input('sender', $request->input('from', $request->input('From'))),
            'subject' => (string) $request->input('subject', $request->input('Subject', '')),
            'body' => (string) ($request->input('stripped-text') ?: $request->input('body-plain', '')),
            'message_id' => $request->input('Message-Id', $request->input('message-id')),
        ]);

        return response()->json(['status' => 'queued']);
    }
}

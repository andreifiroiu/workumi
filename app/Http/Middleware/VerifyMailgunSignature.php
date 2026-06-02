<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

/**
 * Verify that an incoming Mailgun webhook request is authentic.
 *
 * Mailgun signs requests with an HMAC-SHA256 of "{timestamp}{token}" using the
 * webhook signing key. This middleware validates that signature and rejects
 * stale requests to prevent replay attacks.
 */
class VerifyMailgunSignature
{
    /**
     * Maximum age (in seconds) of a webhook request before it is considered stale.
     */
    private const MAX_AGE_SECONDS = 300;

    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $keys = $this->signingKeys();

        if ($keys === []) {
            abort(500, 'Mailgun webhook signing key is not configured.');
        }

        [$timestamp, $token, $signature] = $this->extractSignature($request);

        if ($timestamp === null || $token === null || $signature === null) {
            abort(403, 'Missing Mailgun signature.');
        }

        if (abs(time() - (int) $timestamp) > self::MAX_AGE_SECONDS) {
            abort(403, 'Mailgun signature has expired.');
        }

        if (! $this->signatureMatchesAnyKey($timestamp, $token, $signature, $keys)) {
            abort(403, 'Invalid Mailgun signature.');
        }

        // Enforce single use of the token to prevent replay within the freshness window.
        if (! Cache::add('mailgun-webhook:'.$token, true, self::MAX_AGE_SECONDS)) {
            abort(403, 'Mailgun token has already been used.');
        }

        return $next($request);
    }

    /**
     * Candidate signing keys. Mailgun signs HTTP/event webhooks with the webhook
     * signing key, but inbound Routes have historically been signed with the API
     * key (secret), so we accept either.
     *
     * @return array<int, string>
     */
    private function signingKeys(): array
    {
        return array_values(array_filter([
            config('services.mailgun.webhook_signing_key'),
            config('services.mailgun.secret'),
        ], fn ($key) => ! empty($key)));
    }

    /**
     * Check the signature against every configured key in constant time.
     *
     * @param  array<int, string>  $keys
     */
    private function signatureMatchesAnyKey(string $timestamp, string $token, string $signature, array $keys): bool
    {
        $matched = false;

        foreach ($keys as $key) {
            $expected = hash_hmac('sha256', $timestamp.$token, $key);

            if (hash_equals($expected, $signature)) {
                $matched = true;
            }
        }

        return $matched;
    }

    /**
     * Extract the signature triple, supporting both the flat inbound-route
     * payload and the nested event-webhook payload shapes.
     *
     * @return array{0: string|null, 1: string|null, 2: string|null}
     */
    private function extractSignature(Request $request): array
    {
        if ($request->has('signature') && is_array($request->input('signature'))) {
            return [
                $request->input('signature.timestamp'),
                $request->input('signature.token'),
                $request->input('signature.signature'),
            ];
        }

        return [
            $request->input('timestamp'),
            $request->input('token'),
            $request->input('signature'),
        ];
    }
}

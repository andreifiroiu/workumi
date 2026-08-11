<?php

declare(strict_types=1);

namespace App\Support;

use Closure;
use Illuminate\Support\Str;

/**
 * The one place that decides what a task's checklist item looks like.
 *
 * The column is documented as `[{id, text, completed}]`, but four surfaces write
 * it — the web controller, the REST API, the MCP tools and the agent tools — and
 * they disagreed: the web path normalized only bare strings and passed arrays
 * through untouched, while the API and MCP validated `text` but never assigned an
 * `id`. Items without an `id` cannot be toggled, edited or deleted, because every
 * one of those endpoints matches on it.
 */
final class ChecklistItems
{
    /**
     * Coerce whatever a caller supplied into the canonical shape.
     *
     * Accepts a bare string (the form playbooks and AI suggestions use) or an
     * array; anything else is dropped rather than stored as an item nothing can
     * render. Already-canonical input passes through unchanged, so this is safe
     * to apply on every write.
     *
     * @param  iterable<int, mixed>|null  $items
     * @return array<int, array{id: string, text: string, completed: bool}>
     */
    public static function normalize(?iterable $items): array
    {
        $normalized = [];

        foreach ($items ?? [] as $item) {
            if (is_string($item)) {
                $normalized[] = [
                    'id' => self::newId(),
                    'text' => $item,
                    'completed' => false,
                ];

                continue;
            }

            if (! is_array($item)) {
                continue;
            }

            $text = $item['text'] ?? $item['label'] ?? '';

            // An LLM occasionally emits a nested object here, and the agent paths
            // write without validation; casting it would raise "Array to string
            // conversion" from inside a queued job.
            if (! is_scalar($text)) {
                continue;
            }

            $id = $item['id'] ?? null;

            $normalized[] = [
                'id' => is_string($id) && $id !== '' ? $id : self::newId(),
                'text' => (string) $text,
                'completed' => (bool) ($item['completed'] ?? false),
            ];
        }

        return $normalized;
    }

    /**
     * Validation for a single submitted item, for the surfaces that take user
     * input. Accepts both shapes normalize() understands, so anything that
     * passes survives the round trip intact rather than being silently dropped
     * or stored as a blank row.
     */
    public static function rule(): Closure
    {
        return function (string $attribute, mixed $value, Closure $fail): void {
            if (is_string($value)) {
                return;
            }

            if (is_array($value) && isset($value['text']) && is_string($value['text'])) {
                return;
            }

            $fail('Each checklist item must be text, or an object with a text field.');
        };
    }

    private static function newId(): string
    {
        return Str::uuid()->toString();
    }
}

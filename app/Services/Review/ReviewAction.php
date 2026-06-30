<?php

declare(strict_types=1);

namespace App\Services\Review;

/**
 * Describes a single action button shown in a review flow's action bar.
 *
 * The frontend renders these generically: `kind` drives the client behaviour
 * (resolving a due date, opening a picker, snoozing, or navigating), while
 * `variant` maps to the button colour.
 */
final class ReviewAction
{
    /**
     * @param  'set_due_date'|'assign'|'snooze'|'open'  $kind
     * @param  'today'|'primary'|'accent'|'later'|'neutral'  $variant
     * @param  array<string, mixed>  $payload
     */
    public function __construct(
        public string $key,
        public string $label,
        public string $icon,
        public string $kind,
        public string $variant,
        public array $payload = [],
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'key' => $this->key,
            'label' => $this->label,
            'icon' => $this->icon,
            'kind' => $this->kind,
            'variant' => $this->variant,
            'payload' => $this->payload,
        ];
    }
}

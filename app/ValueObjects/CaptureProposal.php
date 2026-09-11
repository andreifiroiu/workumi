<?php

declare(strict_types=1);

namespace App\ValueObjects;

use App\Enums\AIConfidence;
use App\Enums\CaptureType;

/**
 * What the parser thinks a piece of free text should become.
 *
 * This is a suggestion only. It is handed to the capture panel to pre-fill the
 * form, and nothing is written until the user confirms.
 */
final readonly class CaptureProposal
{
    public function __construct(
        public CaptureType $type,
        public string $title,
        public ?string $description = null,
        public ?int $projectId = null,
        public ?int $workOrderId = null,
        public ?int $partyId = null,
        public ?string $dueDate = null,
        /** What the model said the deadline was, when it could not be read as a date. */
        public ?string $dueDateHint = null,
        public ?string $priority = null,
        public AIConfidence $confidence = AIConfidence::Low,
        public ?string $reasoning = null,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'type' => $this->type->value,
            'title' => $this->title,
            'description' => $this->description,
            'projectId' => $this->projectId !== null ? (string) $this->projectId : null,
            'workOrderId' => $this->workOrderId !== null ? (string) $this->workOrderId : null,
            'partyId' => $this->partyId !== null ? (string) $this->partyId : null,
            'dueDate' => $this->dueDate,
            'dueDateHint' => $this->dueDateHint,
            'priority' => $this->priority,
            'confidence' => $this->confidence->value,
            'reasoning' => $this->reasoning,
        ];
    }
}

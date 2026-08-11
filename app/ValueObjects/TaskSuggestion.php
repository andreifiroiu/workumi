<?php

declare(strict_types=1);

namespace App\ValueObjects;

use App\Enums\AIConfidence;
use App\Enums\TaskStatus;
use App\Models\Task;
use App\Models\WorkOrder;
use App\Support\ChecklistItems;

/**
 * Immutable value object representing a suggested task from PM Copilot.
 *
 * Contains all information needed to present a task suggestion to users
 * and create an actual Task model when approved.
 */
final readonly class TaskSuggestion
{
    /**
     * Create a new task suggestion.
     *
     * @param  string  $title  The suggested title for the task
     * @param  string|null  $description  Detailed description of the task
     * @param  float  $estimatedHours  Estimated hours to complete the task
     * @param  int  $position  Position/order within the work order
     * @param  array<int, string|array{id?: string, text: string, completed?: bool}>  $checklistItems  Checklist items for the task
     * @param  array<int, int|string>  $dependencies  IDs or references of tasks this depends on
     * @param  AIConfidence  $confidence  Confidence level of this suggestion
     * @param  string|null  $reasoning  Explanation of why this suggestion was made
     * @param  int|null  $playbookId  ID of the playbook that influenced this suggestion
     */
    public function __construct(
        public string $title,
        public ?string $description = null,
        public float $estimatedHours = 0.0,
        public int $position = 1,
        public array $checklistItems = [],
        public array $dependencies = [],
        public AIConfidence $confidence = AIConfidence::Medium,
        public ?string $reasoning = null,
        public ?int $playbookId = null,
    ) {}

    /**
     * Convert the suggestion to an array for serialization.
     *
     * @return array{
     *     title: string,
     *     description: string|null,
     *     estimated_hours: float,
     *     position: int,
     *     checklist_items: array<int, string|array{id?: string, text: string, completed?: bool}>,
     *     dependencies: array<int, int|string>,
     *     confidence: string,
     *     reasoning: string|null,
     *     playbook_id: int|null
     * }
     */
    public function toArray(): array
    {
        return [
            'title' => $this->title,
            'description' => $this->description,
            'estimated_hours' => $this->estimatedHours,
            'position' => $this->position,
            'checklist_items' => $this->checklistItems,
            'dependencies' => $this->dependencies,
            'confidence' => $this->confidence->value,
            'reasoning' => $this->reasoning,
            'playbook_id' => $this->playbookId,
        ];
    }

    /**
     * Create a Task model from this suggestion.
     *
     * Creates the task with Todo status for human review before work begins.
     *
     * @param  WorkOrder  $workOrder  The work order to link the task to
     * @return Task The created task model
     */
    public function createTask(WorkOrder $workOrder): Task
    {
        return Task::create([
            'team_id' => $workOrder->team_id,
            'work_order_id' => $workOrder->id,
            'project_id' => $workOrder->project_id,
            'title' => $this->title,
            'description' => $this->description,
            'status' => TaskStatus::Todo,
            'estimated_hours' => $this->estimatedHours,
            'position_in_work_order' => $this->position,
            'checklist_items' => $this->normalizeChecklistItems(),
            'dependencies' => $this->normalizeDependencies(),
            'is_blocked' => false,
            'due_date' => $workOrder->due_date,
        ]);
    }

    /**
     * Create a TaskSuggestion from an array.
     *
     * Useful for parsing LLM responses or deserializing stored suggestions.
     *
     * @param  array{
     *     title: string,
     *     description?: string|null,
     *     estimated_hours?: float|int,
     *     position?: int,
     *     checklist_items?: array<int, string|array{id?: string, text: string, completed?: bool}>,
     *     dependencies?: array<int, int|string>,
     *     confidence?: string,
     *     reasoning?: string|null,
     *     playbook_id?: int|null
     * }  $data
     */
    public static function fromArray(array $data): self
    {
        return new self(
            title: $data['title'],
            description: $data['description'] ?? null,
            estimatedHours: (float) ($data['estimated_hours'] ?? 0.0),
            position: (int) ($data['position'] ?? 1),
            checklistItems: $data['checklist_items'] ?? [],
            dependencies: $data['dependencies'] ?? [],
            confidence: self::parseConfidence($data['confidence'] ?? 'medium'),
            reasoning: $data['reasoning'] ?? null,
            playbookId: $data['playbook_id'] ?? null,
        );
    }

    /**
     * Normalize checklist items to ensure consistent structure.
     *
     * @return array<int, array{id: string, text: string, completed: bool}>
     */
    private function normalizeChecklistItems(): array
    {
        return ChecklistItems::normalize($this->checklistItems);
    }

    /**
     * Normalize dependencies to array of integers.
     *
     * @return array<int, int>
     */
    private function normalizeDependencies(): array
    {
        return array_values(array_filter(
            array_map(fn ($dep) => (int) $dep, $this->dependencies),
            fn ($dep) => $dep > 0
        ));
    }

    /**
     * Parse a string to AIConfidence enum.
     */
    private static function parseConfidence(string $confidence): AIConfidence
    {
        return match (strtolower($confidence)) {
            'high' => AIConfidence::High,
            'low' => AIConfidence::Low,
            default => AIConfidence::Medium,
        };
    }
}

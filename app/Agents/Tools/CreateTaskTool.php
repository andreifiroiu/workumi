<?php

declare(strict_types=1);

namespace App\Agents\Tools;

use App\Contracts\Tools\ToolInterface;
use App\Enums\AIConfidence;
use App\Enums\TaskStatus;
use App\Models\Task;
use App\Models\Team;
use App\Models\WorkOrder;
use App\Support\ChecklistItems;
use Carbon\Carbon;
use InvalidArgumentException;

/**
 * Tool for creating tasks from agent recommendations.
 *
 * Creates a task with Todo status by default, allowing for human review
 * before work begins. Used by PM Copilot Agent for task breakdown workflows.
 */
class CreateTaskTool implements ToolInterface
{
    /**
     * Get the unique identifier name for this tool.
     */
    public function name(): string
    {
        return 'create-task';
    }

    /**
     * Get a human-readable description of what this tool does.
     */
    public function description(): string
    {
        return 'Creates a new task for a work order with Todo status. Used for generating task breakdowns from work order analysis and playbook templates.';
    }

    /**
     * Get the category this tool belongs to.
     */
    public function category(): string
    {
        return 'tasks';
    }

    /**
     * Execute the tool with the given parameters.
     *
     * @param  array<string, mixed>  $params  The parameters for tool execution
     * @return array<string, mixed> The result data from execution
     *
     * @throws InvalidArgumentException If required parameters are missing or invalid
     */
    public function execute(array $params): array
    {
        $this->validateParams($params);

        $teamId = $params['team_id'];
        $workOrderId = $params['work_order_id'];
        $title = $params['title'];
        $description = $params['description'] ?? null;
        $estimatedHours = $params['estimated_hours'] ?? 0;
        $positionInWorkOrder = $params['position_in_work_order'] ?? null;
        $checklistItems = $params['checklist_items'] ?? [];
        $dependencies = $params['dependencies'] ?? [];
        $dueDate = $params['due_date'] ?? null;

        // Validate team exists
        $team = Team::find($teamId);
        if ($team === null) {
            throw new InvalidArgumentException("Team with ID {$teamId} not found");
        }

        // Validate work order exists and belongs to team
        $workOrder = WorkOrder::where('id', $workOrderId)
            ->where('team_id', $teamId)
            ->first();
        if ($workOrder === null) {
            throw new InvalidArgumentException("Work order with ID {$workOrderId} not found or does not belong to team");
        }

        // Auto-calculate position if not provided
        if ($positionInWorkOrder === null) {
            $positionInWorkOrder = $workOrder->tasks()->max('position_in_work_order') ?? 0;
            $positionInWorkOrder += 1;
        }

        // Use work order due date as default if not provided
        if ($dueDate === null) {
            $dueDate = $workOrder->due_date ?? Carbon::now()->addDays(7);
        } else {
            $dueDate = Carbon::parse($dueDate);
        }

        // Normalize checklist items to ensure consistent structure
        $normalizedChecklistItems = $this->normalizeChecklistItems($checklistItems);

        // Normalize dependencies to array of integers
        $normalizedDependencies = $this->normalizeDependencies($dependencies);

        // Calculate confidence level based on input quality
        $confidence = $this->determineConfidence(
            hasDescription: ! empty($description),
            hasEstimate: $estimatedHours > 0,
            hasChecklistItems: ! empty($normalizedChecklistItems),
            hasDependencies: ! empty($normalizedDependencies)
        );

        // Create the task with Todo status
        $task = Task::create([
            'team_id' => $teamId,
            'work_order_id' => $workOrderId,
            'project_id' => $workOrder->project_id,
            'title' => $title,
            'description' => $description,
            'status' => TaskStatus::Todo,
            'estimated_hours' => $estimatedHours,
            'position_in_work_order' => $positionInWorkOrder,
            'checklist_items' => $normalizedChecklistItems,
            'dependencies' => $normalizedDependencies,
            'is_blocked' => false,
            'due_date' => $dueDate,
        ]);

        return [
            'success' => true,
            'task' => [
                'id' => $task->id,
                'title' => $task->title,
                'description' => $task->description,
                'status' => $task->status->value,
                'estimated_hours' => $task->estimated_hours,
                'position_in_work_order' => $task->position_in_work_order,
                'checklist_items' => $task->checklist_items,
                'dependencies' => $task->dependencies,
                'due_date' => $task->due_date?->toDateString(),
                'work_order_id' => $task->work_order_id,
                'project_id' => $task->project_id,
                'team_id' => $task->team_id,
                'created_at' => $task->created_at->toIso8601String(),
            ],
            'confidence' => $confidence->value,
        ];
    }

    /**
     * Get the parameter definitions for this tool.
     *
     * @return array<string, array{type: string, description: string, required: bool}>
     */
    public function getParameters(): array
    {
        return [
            'team_id' => [
                'type' => 'integer',
                'description' => 'The ID of the team to create the task for',
                'required' => true,
            ],
            'work_order_id' => [
                'type' => 'integer',
                'description' => 'The ID of the work order to link the task to',
                'required' => true,
            ],
            'title' => [
                'type' => 'string',
                'description' => 'The title of the task',
                'required' => true,
            ],
            'description' => [
                'type' => 'string',
                'description' => 'Detailed description of the task',
                'required' => false,
            ],
            'estimated_hours' => [
                'type' => 'number',
                'description' => 'Estimated hours to complete the task (default: 0)',
                'required' => false,
            ],
            'position_in_work_order' => [
                'type' => 'integer',
                'description' => 'Position/order of the task within the work order',
                'required' => false,
            ],
            'checklist_items' => [
                'type' => 'array',
                'description' => 'Array of checklist items from playbook templates',
                'required' => false,
            ],
            'dependencies' => [
                'type' => 'array',
                'description' => 'Array of task IDs that this task depends on',
                'required' => false,
            ],
            'due_date' => [
                'type' => 'string',
                'description' => 'Due date in YYYY-MM-DD format (defaults to work order due date or 7 days from now)',
                'required' => false,
            ],
        ];
    }

    /**
     * Validate required parameters.
     *
     * @param  array<string, mixed>  $params
     *
     * @throws InvalidArgumentException If required parameters are missing
     */
    private function validateParams(array $params): void
    {
        $required = ['team_id', 'work_order_id', 'title'];

        foreach ($required as $param) {
            if (! isset($params[$param]) || $params[$param] === null || $params[$param] === '') {
                throw new InvalidArgumentException("{$param} is required");
            }
        }
    }

    /**
     * Normalize checklist items to ensure consistent structure.
     *
     * @param  array<int, mixed>  $items
     * @return array<int, array{id: string, text: string, completed: bool}>
     */
    private function normalizeChecklistItems(array $items): array
    {
        return ChecklistItems::normalize($items);
    }

    /**
     * Normalize dependencies to array of integers.
     *
     * @param  array<int, mixed>  $dependencies
     * @return array<int, int>
     */
    private function normalizeDependencies(array $dependencies): array
    {
        return array_values(array_filter(
            array_map(fn ($dep) => (int) $dep, $dependencies),
            fn ($dep) => $dep > 0
        ));
    }

    /**
     * Determine confidence level based on input completeness.
     */
    private function determineConfidence(
        bool $hasDescription,
        bool $hasEstimate,
        bool $hasChecklistItems,
        bool $hasDependencies
    ): AIConfidence {
        $score = 0;

        if ($hasDescription) {
            $score += 2;
        }

        if ($hasEstimate) {
            $score += 2;
        }

        if ($hasChecklistItems) {
            $score += 1;
        }

        if ($hasDependencies) {
            $score += 1;
        }

        return match (true) {
            $score >= 4 => AIConfidence::High,
            $score >= 2 => AIConfidence::Medium,
            default => AIConfidence::Low,
        };
    }
}

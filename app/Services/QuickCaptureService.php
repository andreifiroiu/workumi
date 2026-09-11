<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\Priority;
use App\Enums\ProjectStatus;
use App\Enums\TaskStatus;
use App\Enums\WorkOrderStatus;
use App\Models\Document;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use App\Models\WorkOrder;
use Illuminate\Database\Eloquent\Model;

/**
 * Creates the records Quick Capture can produce.
 *
 * Capture is deliberately more forgiving than the full create dialogs — a due
 * date is optional, a note needs no parent — but it is never more permissive:
 * every parent id reaching this service has already been team-scoped and
 * visibility-filtered by StoreQuickCaptureRequest.
 */
class QuickCaptureService
{
    public function __construct(
        private readonly NoteWriter $noteWriter,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public function createProject(array $data, User $user, int $teamId): Project
    {
        return Project::create([
            'team_id' => $teamId,
            'party_id' => $data['partyId'],
            'owner_id' => $user->id,
            'accountable_id' => $user->id,
            'name' => $data['title'],
            'description' => $data['description'] ?? null,
            'status' => ProjectStatus::Active,
            'start_date' => $data['startDate'] ?? now()->toDateString(),
            'target_end_date' => $data['dueDate'] ?? null,
            'tags' => [],
            'is_private' => false,
        ]);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function createWorkOrder(array $data, User $user, int $teamId, Project $project): WorkOrder
    {
        return WorkOrder::create([
            'team_id' => $teamId,
            'project_id' => $project->id,
            // Without a position the row sorts NULL-first and jumps above every
            // existing card in the project's ungrouped column.
            'position_in_list' => WorkOrder::nextPositionInList((int) $project->id, null),
            'created_by_id' => $user->id,
            'accountable_id' => $user->id,
            'party_contact_id' => $project->party_id,
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'status' => WorkOrderStatus::Draft,
            'priority' => Priority::from($data['priority'] ?? Priority::Medium->value),
            'due_date' => $data['dueDate'] ?? null,
            'acceptance_criteria' => [],
        ]);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function createTask(array $data, User $user, int $teamId, WorkOrder $workOrder): Task
    {
        return Task::create([
            'team_id' => $teamId,
            'work_order_id' => $workOrder->id,
            'project_id' => $workOrder->project_id,
            'created_by_id' => $user->id,
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'status' => TaskStatus::Todo,
            'due_date' => $data['dueDate'] ?? null,
            'checklist_items' => [],
        ]);
    }

    /**
     * A captured note attaches to the most specific parent chosen. With no parent
     * it belongs to the team and surfaces in the Documents section.
     *
     * @param  array<string, mixed>  $data
     */
    public function createNote(array $data, User $user, int $teamId, ?Model $parent): Document
    {
        return $this->noteWriter->create(
            teamId: $teamId,
            author: $user,
            name: $data['title'],
            content: $data['description'] ?? '',
            parent: $parent,
        );
    }
}

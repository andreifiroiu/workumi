<?php

declare(strict_types=1);

namespace App\Http\Resources\Api\V1;

use App\Models\Task;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Task
 */
class TaskResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'team_id' => $this->team_id,
            'team' => $this->whenLoaded('team', fn () => [
                'id' => $this->team->id,
                'name' => $this->team->name,
            ]),
            'work_order_id' => $this->work_order_id,
            'work_order' => $this->whenLoaded('workOrder', fn () => [
                'id' => $this->workOrder->id,
                'title' => $this->workOrder->title,
            ]),
            'project_id' => $this->project_id,
            'title' => $this->title,
            'description' => $this->description,
            'status' => $this->status?->value,
            'status_label' => $this->status?->label(),
            'due_date' => $this->due_date?->toDateString(),
            'estimated_hours' => $this->estimated_hours,
            'actual_hours' => $this->actual_hours,
            'is_blocked' => $this->is_blocked,
            'blocker_reason' => $this->blocker_reason?->value,
            'blocker_reason_label' => $this->blocker_reason?->label(),
            'blocker_details' => $this->blocker_details,
            'checklist_items' => $this->checklist_items ?? [],
            'checklist_progress' => $this->checklist_progress,
            'position_in_work_order' => $this->position_in_work_order,
            'assigned_to_id' => $this->assigned_to_id,
            'assigned_to' => $this->whenLoaded('assignedTo', fn () => [
                'id' => $this->assignedTo->id,
                'name' => $this->assignedTo->name,
            ]),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}

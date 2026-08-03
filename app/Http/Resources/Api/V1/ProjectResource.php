<?php

declare(strict_types=1);

namespace App\Http\Resources\Api\V1;

use App\Models\Project;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Project
 */
class ProjectResource extends JsonResource
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
            'name' => $this->name,
            'description' => $this->description,
            'status' => $this->status?->value,
            'status_label' => $this->status?->label(),
            'progress' => $this->progress,
            'start_date' => $this->start_date?->toDateString(),
            'target_end_date' => $this->target_end_date?->toDateString(),
            'budget_type' => $this->budget_type?->value,
            'budget_hours' => $this->budget_hours,
            'budget_cost' => $this->budget_cost,
            'actual_hours' => $this->actual_hours,
            'actual_cost' => $this->actual_cost,
            'is_private' => $this->is_private,
            'tags' => $this->tags ?? [],
            'party_id' => $this->party_id,
            'party' => $this->whenLoaded('party', fn () => [
                'id' => $this->party->id,
                'name' => $this->party->name,
            ]),
            'owner_id' => $this->owner_id,
            'owner' => $this->whenLoaded('owner', fn () => [
                'id' => $this->owner->id,
                'name' => $this->owner->name,
            ]),
            'work_orders' => WorkOrderResource::collection($this->whenLoaded('workOrders')),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}

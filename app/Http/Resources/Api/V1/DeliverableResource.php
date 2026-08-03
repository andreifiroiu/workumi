<?php

declare(strict_types=1);

namespace App\Http\Resources\Api\V1;

use App\Models\Deliverable;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Deliverable
 */
class DeliverableResource extends JsonResource
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
            'project' => $this->whenLoaded('project', fn () => [
                'id' => $this->project->id,
                'name' => $this->project->name,
            ]),
            'title' => $this->title,
            'description' => $this->description,
            'type' => $this->type?->value,
            'type_label' => $this->type?->label(),
            'status' => $this->status?->value,
            'status_label' => $this->status?->label(),
            'version' => $this->version,
            'file_url' => $this->file_url,
            'acceptance_criteria' => $this->acceptance_criteria ?? [],
            'created_date' => $this->created_date?->toDateString(),
            'delivered_date' => $this->delivered_date?->toDateString(),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}

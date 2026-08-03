<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use App\Http\Requests\Api\V1\Concerns\ResolvesTeamScope;
use App\Models\WorkOrder;
use App\Support\TeamMembership;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateWorkOrderRequest extends FormRequest
{
    use ResolvesTeamScope;

    private ?WorkOrder $workOrder = null;

    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'title' => ['sometimes', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string'],
            'status' => ['sometimes', 'string', Rule::in(['draft', 'active', 'in_review', 'approved', 'delivered', 'blocked', 'cancelled', 'revision_requested', 'archived'])],
            'priority' => ['sometimes', 'string', Rule::in(['low', 'medium', 'high', 'urgent'])],
            'due_date' => ['sometimes', 'nullable', 'date'],
            'estimated_hours' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'assigned_to_id' => ['sometimes', 'nullable', 'integer', TeamMembership::rule($this->workOrder()->team_id)],
            'acceptance_criteria' => ['sometimes', 'nullable', 'array'],
            'acceptance_criteria.*' => ['string'],
        ];
    }

    public function workOrder(): WorkOrder
    {
        return $this->workOrder ??= WorkOrder::forTeams($this->teamAccess()->teamIds)->visibleTo($this->teamAccess()->userId)
            ->findOrFail($this->route('work_order'));
    }
}

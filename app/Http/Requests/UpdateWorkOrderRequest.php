<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Models\WorkOrder;
use App\Support\TeamMembership;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;

class UpdateWorkOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return Gate::allows('update', $this->workOrder());
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            // Scoped to the work order's own team rather than the actor's current
            // team: those coincide today, but the record is the authority.
            'assignedToId' => ['nullable', 'integer', TeamMembership::rule((int) $this->workOrder()->team_id)],
            'priority' => ['sometimes', 'required', 'string', 'in:low,medium,high,urgent'],
            'due_date' => ['nullable', 'date'],
            'estimated_hours' => ['nullable', 'numeric', 'min:0'],
            'acceptanceCriteria' => ['nullable', 'array'],
            'acceptanceCriteria.*' => ['string'],
            'reason' => ['nullable', 'string'],
        ];
    }

    public function workOrder(): WorkOrder
    {
        /** @var WorkOrder $workOrder */
        $workOrder = $this->route('workOrder');

        return $workOrder;
    }
}

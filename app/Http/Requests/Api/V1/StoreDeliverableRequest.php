<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use App\Http\Requests\Api\V1\Concerns\ResolvesTeamScope;
use App\Models\WorkOrder;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreDeliverableRequest extends FormRequest
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
            'work_order_id' => ['required', 'integer', $this->visibleWorkOrderRule()],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'type' => ['nullable', 'string', Rule::in(['document', 'design', 'report', 'code', 'other'])],
            'status' => ['nullable', 'string', Rule::in(['draft', 'in_review', 'approved', 'delivered'])],
            'version' => ['nullable', 'string', 'max:50'],
            'file_url' => ['nullable', 'url'],
            'acceptance_criteria' => ['nullable', 'array'],
            'acceptance_criteria.*' => ['string'],
        ];
    }

    /**
     * The parent work order. The deliverable inherits its team and project.
     */
    public function workOrder(): WorkOrder
    {
        return $this->workOrder ??= WorkOrder::forTeams($this->teamAccess()->teamIds)
            ->inProjectsVisibleTo($this->teamAccess()->userId)
            ->findOrFail($this->input('work_order_id'));
    }

    /**
     * The parent work order must sit in a project the caller can see, so a
     * private project cannot be written into sideways. Refused as a 422 like any
     * other bad reference rather than passing validation and then 404ing.
     */
    private function visibleWorkOrderRule(): \Closure
    {
        return function (string $attribute, mixed $value, \Closure $fail): void {
            $exists = WorkOrder::forTeams($this->teamAccess()->teamIds)
                ->inProjectsVisibleTo($this->teamAccess()->userId)
                ->whereKey($value)
                ->exists();

            if (! $exists) {
                $fail('The selected work order is invalid.');
            }
        };
    }
}

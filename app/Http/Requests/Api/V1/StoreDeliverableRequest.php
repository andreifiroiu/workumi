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
        return $this->workOrder ??= WorkOrder::forTeams($this->teamAccess()->teamIds)->visibleTo($this->teamAccess()->userId)
            ->findOrFail($this->input('work_order_id'));
    }

    protected function targetTeamId(): int
    {
        return (int) $this->workOrder()->team_id;
    }

    /**
     * A plain `exists` rule cannot express work order visibility, and letting an
     * invisible work order pass validation only to 404 later would report the
     * same refusal two different ways.
     */
    private function visibleWorkOrderRule(): \Closure
    {
        return function (string $attribute, mixed $value, \Closure $fail): void {
            $exists = WorkOrder::forTeams($this->teamAccess()->teamIds)
                ->visibleTo($this->teamAccess()->userId)
                ->whereKey($value)
                ->exists();

            if (! $exists) {
                $fail('The selected work order is invalid.');
            }
        };
    }
}

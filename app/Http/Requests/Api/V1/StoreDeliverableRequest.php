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
            'work_order_id' => ['required', 'integer', Rule::exists('work_orders', 'id')->whereIn('team_id', $this->teamAccess()->teamIds)],
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
            ->findOrFail($this->input('work_order_id'));
    }
}

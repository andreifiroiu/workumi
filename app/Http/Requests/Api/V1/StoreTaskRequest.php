<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use App\Http\Requests\Api\V1\Concerns\ResolvesTeamScope;
use App\Models\WorkOrder;
use App\Support\TeamMembership;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTaskRequest extends FormRequest
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
            'status' => ['nullable', 'string', Rule::in(['todo', 'in_progress', 'in_review', 'approved', 'done', 'blocked', 'cancelled', 'revision_requested'])],
            'due_date' => ['nullable', 'date'],
            'estimated_hours' => ['nullable', 'numeric', 'min:0'],
            'assigned_to_id' => ['nullable', 'integer', $this->assigneeRule()],
            'checklist_items' => ['nullable', 'array'],
            'checklist_items.*.text' => ['required_with:checklist_items', 'string'],
        ];
    }

    /**
     * The parent work order. The task inherits its team and project.
     */
    public function workOrder(): WorkOrder
    {
        return $this->workOrder ??= WorkOrder::forTeams($this->teamAccess()->teamIds)
            ->findOrFail($this->input('work_order_id'));
    }

    private function assigneeRule(): \Closure
    {
        return function (string $attribute, mixed $value, \Closure $fail): void {
            $workOrder = WorkOrder::forTeams($this->teamAccess()->teamIds)->find($this->input('work_order_id'));

            if ($workOrder === null) {
                return;
            }

            TeamMembership::rule($workOrder->team_id)($attribute, $value, $fail);
        };
    }
}

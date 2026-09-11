<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Http\Requests\Concerns\ResolvesTeamScopedTargets;
use App\Models\Task;
use App\Models\WorkOrder;
use App\Support\ChecklistItems;
use App\Support\TeamMembership;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;

class StoreTaskRequest extends FormRequest
{
    use ResolvesTeamScopedTargets;

    private ?WorkOrder $workOrder = null;

    /**
     * Checked before validation so a read-only member is refused outright rather
     * than being told which fields are malformed.
     */
    public function authorize(): bool
    {
        return Gate::allows('create', Task::class);
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'workOrderId' => ['required', 'integer', $this->visibleWorkOrderRule()],
            'assignedToId' => ['nullable', 'integer', TeamMembership::rule($this->teamId())],
            'dueDate' => ['required', 'date'],
            'estimatedHours' => ['nullable', 'numeric', 'min:0'],
            'checklistItems' => ['nullable', 'array'],
            'checklistItems.*' => [ChecklistItems::rule()],
        ];
    }

    /**
     * The parent work order. The task inherits its project from it.
     */
    public function workOrder(): WorkOrder
    {
        if ($this->workOrder === null) {
            /** @var WorkOrder $workOrder */
            $workOrder = $this->visibleWorkOrders()->findOrFail($this->input('workOrderId'));
            $this->workOrder = $workOrder;
        }

        return $this->workOrder;
    }
}

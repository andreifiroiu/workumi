<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Models\Task;
use App\Models\WorkOrder;
use App\Support\TeamMembership;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;

class StoreTaskRequest extends FormRequest
{
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
            'assignedToId' => ['nullable', 'integer', $this->assigneeRule()],
            'dueDate' => ['required', 'date'],
            'estimatedHours' => ['nullable', 'numeric', 'min:0'],
            'checklistItems' => ['nullable', 'array'],
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

    public function teamId(): int
    {
        return (int) ($this->user()->currentTeam?->id ?? 0);
    }

    /**
     * Work orders the current user may attach a task to: their own team's, minus
     * anything hidden inside a private project.
     *
     * @return Builder<WorkOrder>
     */
    private function visibleWorkOrders(): Builder
    {
        return WorkOrder::query()
            ->forTeam($this->teamId())
            ->visibleTo((int) $this->user()->id);
    }

    /**
     * A plain `exists` rule cannot express team scope or work order visibility,
     * and the web surface must not be more permissive than the API and MCP ones.
     */
    private function visibleWorkOrderRule(): Closure
    {
        return function (string $attribute, mixed $value, Closure $fail): void {
            if (! $this->visibleWorkOrders()->whereKey($value)->exists()) {
                $fail('The selected work order is invalid.');
            }
        };
    }

    private function assigneeRule(): Closure
    {
        return function (string $attribute, mixed $value, Closure $fail): void {
            TeamMembership::rule($this->teamId())($attribute, $value, $fail);
        };
    }
}

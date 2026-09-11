<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Enums\CaptureType;
use App\Http\Requests\Concerns\ResolvesTeamScopedTargets;
use App\Models\Project;
use App\Models\Task;
use App\Models\WorkOrder;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class StoreQuickCaptureRequest extends FormRequest
{
    use ResolvesTeamScopedTargets;

    /**
     * Checked before validation so a read-only member is refused outright rather
     * than being told which fields are malformed.
     */
    public function authorize(): bool
    {
        $user = $this->user();

        if ($user?->currentTeam === null) {
            return false;
        }

        return match ($this->captureType()) {
            CaptureType::Project => Gate::allows('create', Project::class),
            CaptureType::WorkOrder => Gate::allows('create', WorkOrder::class),
            CaptureType::Task => Gate::allows('create', Task::class),
            // Documents have no class-level create ability, so the same
            // non-viewer check the policies apply is made directly.
            CaptureType::Note => $user->canWriteTeamContent($user->currentTeam),
            // An unknown type is rejected by the rules, not here.
            null => true,
        };
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $type = $this->captureType();

        return [
            'type' => ['required', Rule::enum(CaptureType::class)],
            'title' => ['required', 'string', 'max:255'],
            // A note's body is written to disk, so it can be long. The other
            // three go into a MySQL `text` column capped at 65,535 *bytes*,
            // while `max:` counts characters — so the record limit leaves room
            // for multibyte text rather than letting a long paste become a 500.
            'description' => [
                'nullable', 'string',
                'max:'.($type === CaptureType::Note ? 1000000 : 10000),
            ],

            'partyId' => [
                Rule::requiredIf($type === CaptureType::Project),
                'nullable', 'integer', $this->teamPartyRule(),
            ],
            'projectId' => [
                Rule::requiredIf($type === CaptureType::WorkOrder),
                'nullable', 'integer', $this->visibleProjectRule(),
            ],
            'workOrderId' => [
                Rule::requiredIf($type === CaptureType::Task),
                'nullable', 'integer', $this->visibleWorkOrderRule(),
            ],

            // Capture is intentionally looser than the full create dialogs: a due
            // date is optional here, and the columns are nullable.
            'dueDate' => ['nullable', 'date'],
            'startDate' => ['nullable', 'date'],
            'priority' => ['nullable', 'string', 'in:low,medium,high,urgent'],
        ];
    }

    public function captureType(): ?CaptureType
    {
        $type = $this->input('type');

        return is_string($type) ? CaptureType::tryFrom($type) : null;
    }

    public function project(): Project
    {
        /** @var Project $project */
        $project = $this->visibleProjects()->findOrFail($this->input('projectId'));

        return $project;
    }

    public function workOrder(): WorkOrder
    {
        /** @var WorkOrder $workOrder */
        $workOrder = $this->visibleWorkOrders()->findOrFail($this->input('workOrderId'));

        return $workOrder;
    }

    /**
     * The most specific parent a captured note was filed under, or null when it
     * was captured loose.
     */
    public function noteParent(): WorkOrder|Project|null
    {
        if ($this->filled('workOrderId')) {
            return $this->workOrder();
        }

        if ($this->filled('projectId')) {
            return $this->project();
        }

        return null;
    }
}

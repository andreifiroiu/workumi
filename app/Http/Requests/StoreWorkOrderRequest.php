<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Models\Project;
use App\Models\WorkOrder;
use App\Models\WorkOrderList;
use App\Support\TeamMembership;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;

class StoreWorkOrderRequest extends FormRequest
{
    private ?Project $project = null;

    /**
     * Checked before validation so a read-only member is refused outright rather
     * than being told which fields are malformed.
     */
    public function authorize(): bool
    {
        // No active team is refused here rather than left to the field rules,
        // which would otherwise report "the selected project is invalid" about a
        // perfectly good project.
        return $this->user()?->currentTeam !== null
            && Gate::allows('create', WorkOrder::class);
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'projectId' => ['required', 'integer', $this->visibleProjectRule()],
            'assignedToId' => ['nullable', 'integer', TeamMembership::rule($this->teamId())],
            'priority' => ['required', 'string', 'in:low,medium,high,urgent'],
            'dueDate' => ['nullable', 'date'],
            'estimatedHours' => ['nullable', 'numeric', 'min:0'],
            'acceptanceCriteria' => ['nullable', 'array'],
            'acceptanceCriteria.*' => ['string'],
            // A list belongs to exactly one project, so scoping it to the project
            // scopes it to the team as well.
            'workOrderListId' => ['nullable', 'integer', $this->listInProjectRule()],
        ];
    }

    /**
     * The parent project. The work order inherits its party contact from it.
     */
    public function project(): Project
    {
        if ($this->project === null) {
            /** @var Project $project */
            $project = $this->visibleProjects()->findOrFail($this->input('projectId'));
            $this->project = $project;
        }

        return $this->project;
    }

    public function teamId(): int
    {
        // authorize() has already refused a user without a current team.
        return (int) $this->user()->currentTeam->id;
    }

    /**
     * @return Builder<Project>
     */
    private function visibleProjects(): Builder
    {
        return Project::query()
            ->forTeam($this->teamId())
            ->visibleTo((int) $this->user()->id);
    }

    /**
     * A plain `exists` rule expresses neither team scope nor project privacy. The
     * row is created with the current team's id, so an unscoped project would
     * produce a work order whose team and project disagree.
     */
    private function visibleProjectRule(): Closure
    {
        return function (string $attribute, mixed $value, Closure $fail): void {
            if (! $this->visibleProjects()->whereKey($value)->exists()) {
                $fail('The selected project is invalid.');
            }
        };
    }

    /**
     * The list must sit in the project the work order is being created in.
     *
     * Stays quiet when the project itself is invalid: reporting both would tell
     * the user their list is wrong when the only thing actually known is that the
     * project it was checked against never resolved.
     */
    private function listInProjectRule(): Closure
    {
        return function (string $attribute, mixed $value, Closure $fail): void {
            $projectId = $this->input('projectId');

            if (! $this->visibleProjects()->whereKey($projectId)->exists()) {
                return;
            }

            $inProject = WorkOrderList::query()
                ->where('project_id', $projectId)
                ->whereKey($value)
                ->exists();

            if (! $inProject) {
                $fail('The selected list does not belong to this project.');
            }
        };
    }
}

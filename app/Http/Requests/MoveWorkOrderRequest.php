<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Models\Project;
use App\Models\WorkOrder;
use App\Models\WorkOrderList;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;

class MoveWorkOrderRequest extends FormRequest
{
    private ?Project $destinationProject = null;

    /**
     * Checked before validation so a read-only member — or anyone who cannot see
     * the project the work order currently sits in — is refused outright rather
     * than being told which fields are malformed.
     */
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
            'projectId' => ['required', 'integer', $this->destinationProjectRule()],
            // A list belongs to exactly one project, so scoping it to the
            // destination scopes it to the team as well.
            'workOrderListId' => ['nullable', 'integer', $this->listInDestinationRule()],
        ];
    }

    public function workOrder(): WorkOrder
    {
        /** @var WorkOrder $workOrder */
        $workOrder = $this->route('workOrder');

        return $workOrder;
    }

    /**
     * The project the work order is moving into. Resolved through the same scope
     * the rules validate against, so it can never be a project the actor was
     * refused.
     */
    public function destinationProject(): Project
    {
        if ($this->destinationProject === null) {
            /** @var Project $project */
            $project = $this->destinationProjects()->findOrFail($this->input('projectId'));
            $this->destinationProject = $project;
        }

        return $this->destinationProject;
    }

    /**
     * The list to file the work order under, or null to leave it ungrouped.
     */
    public function destinationListId(): ?int
    {
        $listId = $this->input('workOrderListId');

        return $listId === null ? null : (int) $listId;
    }

    /**
     * Scoped to the work order's own team rather than the actor's current team:
     * those coincide today, but the record is the authority and a work order
     * never changes teams.
     *
     * @return Builder<Project>
     */
    private function destinationProjects(): Builder
    {
        return Project::query()
            ->forTeam((int) $this->workOrder()->team_id)
            ->notArchived()
            ->visibleTo((int) $this->user()->id);
    }

    /**
     * A plain `exists` rule expresses neither team scope, nor project privacy,
     * nor the archive state — moving live work into an archived project would
     * file it somewhere the tree never renders.
     *
     * A rejected destination is a bad field value rather than a forbidden action,
     * so it fails validation instead of aborting: the dialog can render this,
     * where it cannot render a 403.
     */
    private function destinationProjectRule(): Closure
    {
        return function (string $attribute, mixed $value, Closure $fail): void {
            $project = $this->destinationProjects()->whereKey($value)->first();

            if ($project === null || ! Gate::allows('update', $project)) {
                $fail('The selected project is invalid.');
            }
        };
    }

    /**
     * The list must sit in the project the work order is moving into.
     *
     * Stays quiet when the destination itself is invalid: reporting both would
     * tell the user their list is wrong when the only thing actually known is
     * that the project it was checked against never resolved.
     */
    private function listInDestinationRule(): Closure
    {
        return function (string $attribute, mixed $value, Closure $fail): void {
            $projectId = $this->input('projectId');

            if (! $this->destinationProjects()->whereKey($projectId)->exists()) {
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

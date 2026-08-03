<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use App\Http\Requests\Api\V1\Concerns\ResolvesTeamScope;
use App\Models\Project;
use App\Support\TeamMembership;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreWorkOrderRequest extends FormRequest
{
    use ResolvesTeamScope;

    private ?Project $project = null;

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
            'project_id' => ['required', 'integer', Rule::exists('projects', 'id')->whereIn('team_id', $this->teamAccess()->teamIds)],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'status' => ['nullable', 'string', Rule::in(['draft', 'active', 'in_review', 'approved', 'delivered', 'blocked', 'cancelled', 'revision_requested'])],
            'priority' => ['nullable', 'string', Rule::in(['low', 'medium', 'high', 'urgent'])],
            'due_date' => ['nullable', 'date'],
            'estimated_hours' => ['nullable', 'numeric', 'min:0'],
            'assigned_to_id' => ['nullable', 'integer', $this->assigneeRule()],
            'acceptance_criteria' => ['nullable', 'array'],
            'acceptance_criteria.*' => ['string'],
        ];
    }

    /**
     * The parent project. The work order inherits its team.
     */
    public function project(): Project
    {
        return $this->project ??= Project::forTeams($this->teamAccess()->teamIds)
            ->findOrFail($this->input('project_id'));
    }

    /**
     * The assignee must belong to the parent project's team, which is only
     * known once project_id itself has passed validation.
     */
    private function assigneeRule(): \Closure
    {
        return function (string $attribute, mixed $value, \Closure $fail): void {
            $project = Project::forTeams($this->teamAccess()->teamIds)->find($this->input('project_id'));

            if ($project === null) {
                return;
            }

            TeamMembership::rule($project->team_id)($attribute, $value, $fail);
        };
    }
}

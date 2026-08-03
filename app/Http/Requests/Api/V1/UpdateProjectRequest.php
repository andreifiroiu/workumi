<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use App\Http\Requests\Api\V1\Concerns\ResolvesTeamScope;
use App\Models\Project;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProjectRequest extends FormRequest
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
            'name' => ['sometimes', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string'],
            'status' => ['sometimes', 'string', Rule::in(['active', 'on_hold', 'completed', 'archived'])],
            'start_date' => ['sometimes', 'date'],
            'target_end_date' => ['sometimes', 'nullable', 'date'],
            // Not nullable: projects.party_id is NOT NULL, so clearing it would
            // fail at the database rather than in validation.
            'party_id' => ['sometimes', 'integer', Rule::exists('parties', 'id')->where('team_id', $this->project()->team_id)],
            'budget_hours' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'budget_cost' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'budget_type' => ['sometimes', 'nullable', 'string', Rule::in(['fixed_price', 'time_and_materials', 'monthly_subscription'])],
            'is_private' => ['sometimes', 'boolean'],
            'tags' => ['sometimes', 'nullable', 'array'],
            'tags.*' => ['string'],
        ];
    }

    /**
     * The project being updated, found in any team this token can reach.
     */
    public function project(): Project
    {
        return $this->project ??= Project::forTeams($this->teamAccess()->teamIds)
            ->findOrFail($this->route('project'));
    }
}

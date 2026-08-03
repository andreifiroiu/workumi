<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use App\Http\Requests\Api\V1\Concerns\ResolvesTeamScope;
use App\Support\TeamMembership;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreProjectRequest extends FormRequest
{
    use ResolvesTeamScope;

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
            'team_id' => ['nullable', 'integer'],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'status' => ['nullable', 'string', Rule::in(['active', 'on_hold', 'completed'])],
            'start_date' => ['nullable', 'date'],
            'target_end_date' => ['nullable', 'date'],
            // projects.party_id and projects.owner_id are both NOT NULL.
            'party_id' => ['required', 'integer', Rule::exists('parties', 'id')->where('team_id', $this->teamId())],
            'owner_id' => ['nullable', 'integer', TeamMembership::rule($this->teamId())],
            'budget_hours' => ['nullable', 'numeric', 'min:0'],
            'budget_cost' => ['nullable', 'numeric', 'min:0'],
            'budget_type' => ['nullable', 'string', Rule::in(['fixed_price', 'time_and_materials', 'monthly_subscription'])],
            'is_private' => ['nullable', 'boolean'],
            'tags' => ['nullable', 'array'],
            'tags.*' => ['string'],
        ];
    }

    /**
     * The team to create the project in. Falls back to the token's default team
     * and fails with a 422 naming the options when the choice is ambiguous.
     */
    public function teamId(): int
    {
        return $this->teamAccess()->resolve(
            $this->has('team_id') && $this->input('team_id') !== null ? $this->integer('team_id') : null
        );
    }

    /**
     * @return array<string, mixed>
     */
    public function attributes(): array
    {
        return ['party_id' => 'party'];
    }
}

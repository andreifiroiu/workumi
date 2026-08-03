<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use App\Http\Requests\Api\V1\Concerns\ResolvesTeamScope;
use App\Models\Deliverable;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateDeliverableRequest extends FormRequest
{
    use ResolvesTeamScope;

    private ?Deliverable $deliverable = null;

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
            'title' => ['sometimes', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string'],
            'type' => ['sometimes', 'string', Rule::in(['document', 'design', 'report', 'code', 'other'])],
            'status' => ['sometimes', 'string', Rule::in(['draft', 'in_review', 'approved', 'delivered'])],
            'version' => ['sometimes', 'nullable', 'string', 'max:50'],
            'file_url' => ['sometimes', 'nullable', 'url'],
            'acceptance_criteria' => ['sometimes', 'nullable', 'array'],
            'acceptance_criteria.*' => ['string'],
        ];
    }

    public function deliverable(): Deliverable
    {
        return $this->deliverable ??= Deliverable::forTeams($this->teamAccess()->teamIds)->visibleTo($this->teamAccess()->userId)
            ->findOrFail($this->route('deliverable'));
    }

    protected function targetTeamId(): int
    {
        return (int) $this->deliverable()->team_id;
    }
}

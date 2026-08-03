<?php

declare(strict_types=1);

namespace App\Http\Requests\Settings;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreUserRateRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->canAdministerTeam() ?? false;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $team = $this->user()?->currentTeam;

        return [
            // Constrained to the acting user's own team. Uses allUsers() rather
            // than an exists rule against the pivot because the team owner has
            // no team_user row and must still be able to hold a rate.
            'user_id' => [
                'required',
                'integer',
                Rule::in($team?->allUsers()->pluck('id')->all() ?? []),
            ],
            'internal_rate' => ['required', 'numeric', 'min:0', 'regex:/^\d+(\.\d{1,2})?$/'],
            'billing_rate' => ['required', 'numeric', 'min:0', 'regex:/^\d+(\.\d{1,2})?$/'],
            'effective_date' => ['required', 'date'],
        ];
    }

    /**
     * Get custom error messages for validation rules.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'user_id.in' => 'The selected user is not a member of your workspace.',
            'internal_rate.regex' => 'The internal rate must have at most 2 decimal places.',
            'billing_rate.regex' => 'The billing rate must have at most 2 decimal places.',
            'internal_rate.min' => 'The internal rate must be a positive number.',
            'billing_rate.min' => 'The billing rate must be a positive number.',
        ];
    }
}

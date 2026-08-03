<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Rules\BelongsToTeam;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreProjectMemberRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        // One instance so the team's user collection is resolved once, not once per id.
        $belongsToTeam = new BelongsToTeam($this->user()?->currentTeam);

        return [
            'user_ids' => ['required', 'array', 'min:1', 'max:50'],
            'user_ids.*' => ['integer', 'distinct', 'exists:users,id', $belongsToTeam],
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
            'user_ids.required' => 'Select at least one person to add.',
            'user_ids.*.exists' => 'One or more of the selected users do not exist.',
            'user_ids.*.distinct' => 'The same person was selected more than once.',
        ];
    }
}

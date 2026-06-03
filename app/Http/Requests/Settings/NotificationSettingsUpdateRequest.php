<?php

namespace App\Http\Requests\Settings;

use App\Models\NotificationPreference;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class NotificationSettingsUpdateRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $rules = [
            'daily_digest_hour' => ['required', 'integer', 'between:0,23'],
        ];

        foreach (NotificationPreference::editableFields() as $field) {
            $rules[$field] = ['required', 'boolean'];
        }

        return $rules;
    }
}

<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Models\WorkOrder;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;

class ImportWorkOrderTasksRequest extends FormRequest
{
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
            'file' => ['required', 'file', 'extensions:md,markdown,txt', 'max:1024'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'file.required' => 'Choose a Markdown or text file to import.',
            'file.extensions' => 'Only .md and .txt files can be imported.',
            'file.max' => 'The file may not be larger than 1 MB.',
        ];
    }

    public function workOrder(): WorkOrder
    {
        /** @var WorkOrder $workOrder */
        $workOrder = $this->route('workOrder');

        return $workOrder;
    }
}

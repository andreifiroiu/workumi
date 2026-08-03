<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use App\Http\Requests\Api\V1\Concerns\ResolvesTeamScope;
use App\Models\Task;
use App\Support\TeamMembership;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateTaskRequest extends FormRequest
{
    use ResolvesTeamScope;

    private ?Task $task = null;

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
            'status' => ['sometimes', 'string', Rule::in(['todo', 'in_progress', 'in_review', 'approved', 'done', 'blocked', 'cancelled', 'revision_requested', 'archived'])],
            'due_date' => ['sometimes', 'nullable', 'date'],
            'estimated_hours' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'assigned_to_id' => ['sometimes', 'nullable', 'integer', TeamMembership::rule($this->task()->team_id)],
            'is_blocked' => ['sometimes', 'boolean'],
            'blocker_reason' => ['sometimes', 'nullable', 'string', Rule::in(['waiting_on_external', 'missing_information', 'technical_issue', 'waiting_on_approval'])],
            'blocker_details' => ['sometimes', 'nullable', 'string'],
            'checklist_items' => ['sometimes', 'nullable', 'array'],
            'checklist_items.*.text' => ['required_with:checklist_items', 'string'],
            'checklist_items.*.completed' => ['sometimes', 'boolean'],
        ];
    }

    public function task(): Task
    {
        return $this->task ??= Task::forTeams($this->teamAccess()->teamIds)->visibleTo($this->teamAccess()->userId)
            ->findOrFail($this->route('task'));
    }

    protected function targetTeamId(): int
    {
        return (int) $this->task()->team_id;
    }
}

<?php

declare(strict_types=1);

namespace App\Services\Review\Flows;

use App\Enums\ReviewFlowType;
use App\Enums\TaskStatus;
use App\Models\Task;
use App\Models\Team;
use App\Models\User;
use App\Services\Review\AbstractReviewFlow;
use App\Services\Review\ReviewAction;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class TasksMissingAssigneeFlow extends AbstractReviewFlow
{
    /**
     * Task statuses that no longer need an owner.
     */
    private const EXCLUDED_STATUSES = [
        TaskStatus::Done->value,
        TaskStatus::Approved->value,
        TaskStatus::Cancelled->value,
        TaskStatus::Archived->value,
    ];

    public function type(): ReviewFlowType
    {
        return ReviewFlowType::TasksMissingAssignee;
    }

    public function query(Team $team, User $user): Builder
    {
        $query = Task::forTeam($team->id)
            ->whereNull('assigned_to_id')
            ->whereNull('assigned_agent_id')
            ->whereNotIn('status', self::EXCLUDED_STATUSES)
            ->with(['workOrder.project', 'assignedTo'])
            ->orderBy('due_date')
            ->orderBy('created_at');

        return $this->excludeSnoozed($query, $user);
    }

    public function actions(): array
    {
        return [
            new ReviewAction('assign_me', 'Assign to me', 'UserCheck', 'assign', 'today', ['target' => 'me']),
            new ReviewAction('assign_other', 'Assign…', 'Users', 'assign', 'primary', ['target' => 'pick']),
            new ReviewAction('open', 'Open', 'ArrowUpRight', 'open', 'neutral'),
            new ReviewAction('snooze', 'Later', 'Clock', 'snooze', 'later', ['days' => 7]),
        ];
    }

    public function mapItem(Model $item): array
    {
        /** @var Task $item */
        return $this->mapTask($item);
    }
}

<?php

declare(strict_types=1);

namespace App\Services\Review\Flows;

use App\Enums\ReviewFlowType;
use App\Enums\WorkOrderStatus;
use App\Models\Team;
use App\Models\User;
use App\Models\WorkOrder;
use App\Services\Review\AbstractReviewFlow;
use App\Services\Review\ReviewAction;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class WorkOrdersMissingDueDateFlow extends AbstractReviewFlow
{
    /**
     * Work order statuses that are no longer worth scheduling.
     */
    private const EXCLUDED_STATUSES = [
        WorkOrderStatus::Delivered->value,
        WorkOrderStatus::Approved->value,
        WorkOrderStatus::Cancelled->value,
        WorkOrderStatus::Archived->value,
    ];

    public function type(): ReviewFlowType
    {
        return ReviewFlowType::WorkOrdersMissingDueDate;
    }

    public function query(Team $team, User $user): Builder
    {
        $query = WorkOrder::forTeam($team->id)
            ->whereNull('due_date')
            ->whereNotIn('status', self::EXCLUDED_STATUSES)
            ->notBacklog()
            ->with(['project', 'assignedTo'])
            ->orderBy('created_at');

        return $this->excludeSnoozed($query, $user);
    }

    public function actions(): array
    {
        return [
            new ReviewAction('today', 'Today', 'CalendarCheck', 'set_due_date', 'today', ['preset' => 'today']),
            new ReviewAction('this_week', 'This week', 'CalendarRange', 'set_due_date', 'primary', ['preset' => 'this_week']),
            new ReviewAction('next_week', 'Next week', 'CalendarArrowUp', 'set_due_date', 'accent', ['preset' => 'next_week']),
            new ReviewAction('pick_date', 'Pick date', 'CalendarPlus', 'set_due_date', 'neutral', ['preset' => 'custom']),
            new ReviewAction('snooze', 'Later', 'Clock', 'snooze', 'later', ['days' => 7]),
            new ReviewAction('complete', 'Completed', 'CheckCircle2', 'complete', 'success'),
        ];
    }

    public function mapItem(Model $item): array
    {
        /** @var WorkOrder $item */
        return $this->mapWorkOrder($item);
    }
}

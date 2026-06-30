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

class WorkOrdersMissingAssigneeFlow extends AbstractReviewFlow
{
    private const EXCLUDED_STATUSES = [
        WorkOrderStatus::Delivered->value,
        WorkOrderStatus::Approved->value,
        WorkOrderStatus::Cancelled->value,
        WorkOrderStatus::Archived->value,
    ];

    public function type(): ReviewFlowType
    {
        return ReviewFlowType::WorkOrdersMissingAssignee;
    }

    public function query(Team $team, User $user): Builder
    {
        $query = WorkOrder::forTeam($team->id)
            ->whereNull('assigned_to_id')
            ->whereNotIn('status', self::EXCLUDED_STATUSES)
            ->notBacklog()
            ->with(['project', 'assignedTo'])
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
            new ReviewAction('complete', 'Completed', 'CheckCircle2', 'complete', 'success'),
        ];
    }

    public function mapItem(Model $item): array
    {
        /** @var WorkOrder $item */
        return $this->mapWorkOrder($item);
    }
}

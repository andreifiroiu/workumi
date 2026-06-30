<?php

namespace App\Enums;

enum ReviewFlowType: string
{
    case WorkOrdersMissingDueDate = 'work-orders-missing-due-date';
    case WorkOrdersMissingAssignee = 'work-orders-missing-assignee';
    case TasksMissingAssignee = 'tasks-missing-assignee';

    public function label(): string
    {
        return match ($this) {
            self::WorkOrdersMissingDueDate => 'Work orders without a due date',
            self::WorkOrdersMissingAssignee => 'Work orders without an owner',
            self::TasksMissingAssignee => 'Tasks without an assignee',
        };
    }

    public function description(): string
    {
        return match ($this) {
            self::WorkOrdersMissingDueDate => 'Give every active work order a deadline so nothing slips through the cracks.',
            self::WorkOrdersMissingAssignee => 'Make sure each active work order has someone accountable for it.',
            self::TasksMissingAssignee => 'Assign every open task to a team member so the work has a clear owner.',
        };
    }

    /**
     * Lucide icon name used by the frontend.
     */
    public function icon(): string
    {
        return match ($this) {
            self::WorkOrdersMissingDueDate => 'CalendarClock',
            self::WorkOrdersMissingAssignee => 'UserPlus',
            self::TasksMissingAssignee => 'UserPlus',
        };
    }

    public function entityType(): ReviewEntityType
    {
        return match ($this) {
            self::WorkOrdersMissingDueDate, self::WorkOrdersMissingAssignee => ReviewEntityType::WorkOrder,
            self::TasksMissingAssignee => ReviewEntityType::Task,
        };
    }
}

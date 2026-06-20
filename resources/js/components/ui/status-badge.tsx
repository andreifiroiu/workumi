import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Task status values matching backend TaskStatus enum
 */
export type TaskStatus =
    | 'todo'
    | 'in_progress'
    | 'in_review'
    | 'approved'
    | 'done'
    | 'blocked'
    | 'cancelled'
    | 'revision_requested';

/**
 * Work order status values matching backend WorkOrderStatus enum
 */
export type WorkOrderStatus =
    | 'draft'
    | 'active'
    | 'in_review'
    | 'approved'
    | 'delivered'
    | 'blocked'
    | 'cancelled'
    | 'revision_requested'
    | 'backlog';

/**
 * Union type for all possible status values
 */
export type Status = TaskStatus | WorkOrderStatus;

/**
 * Labels for each status value
 */
const taskStatusLabels: Record<TaskStatus, string> = {
    todo: 'To Do',
    in_progress: 'In Progress',
    in_review: 'In Review',
    approved: 'Approved',
    done: 'Done',
    blocked: 'Blocked',
    cancelled: 'Cancelled',
    revision_requested: 'Revision Requested',
};

const workOrderStatusLabels: Record<WorkOrderStatus, string> = {
    draft: 'Draft',
    active: 'Active',
    in_review: 'In Review',
    approved: 'Approved',
    delivered: 'Delivered',
    blocked: 'Blocked',
    cancelled: 'Cancelled',
    revision_requested: 'Revision Requested',
    backlog: 'Backlog',
};

/**
 * Color mapping for each status - matches backend enum color() method
 * Colors: slate, indigo/blue, amber, emerald, red, orange
 */
const statusColorClasses: Record<Status, string> = {
    // Task statuses
    todo: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    in_progress:
        'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900 dark:text-indigo-300 dark:border-indigo-800',
    in_review:
        'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900 dark:text-amber-300 dark:border-amber-800',
    approved:
        'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900 dark:text-emerald-300 dark:border-emerald-800',
    done: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900 dark:text-emerald-300 dark:border-emerald-800',
    blocked:
        'bg-red-100 text-red-700 border-red-200 dark:bg-red-900 dark:text-red-300 dark:border-red-800',
    cancelled:
        'bg-red-100 text-red-700 border-red-200 dark:bg-red-900 dark:text-red-300 dark:border-red-800',
    revision_requested:
        'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900 dark:text-orange-300 dark:border-orange-800',
    // Work order specific statuses
    draft: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    active: 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900 dark:text-indigo-300 dark:border-indigo-800',
    delivered:
        'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900 dark:text-emerald-300 dark:border-emerald-800',
    backlog: 'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700',
};

const statusBadgeVariants = cva(
    'inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 transition-colors',
    {
        variants: {
            size: {
                default: 'px-2 py-0.5 text-xs',
                sm: 'px-1.5 py-0.5 text-[10px]',
                lg: 'px-2.5 py-1 text-sm',
            },
        },
        defaultVariants: {
            size: 'default',
        },
    }
);

export interface StatusBadgeProps
    extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'>,
        VariantProps<typeof statusBadgeVariants> {
    /** The status value to display */
    status: Status;
    /** Whether this is a task or work order status (affects label lookup) */
    variant: 'task' | 'work_order';
}

/**
 * StatusBadge displays a colored badge for task or work order statuses.
 * Colors and labels match the backend TaskStatus and WorkOrderStatus enums.
 */
function StatusBadge({ status, variant, size, className, ...props }: StatusBadgeProps) {
    const label =
        variant === 'task'
            ? taskStatusLabels[status as TaskStatus]
            : workOrderStatusLabels[status as WorkOrderStatus];

    const colorClass = statusColorClasses[status];

    return (
        <span
            data-slot="status-badge"
            data-status={status}
            data-variant={variant}
            className={cn(statusBadgeVariants({ size }), colorClass, className)}
            {...props}
        >
            {label}
        </span>
    );
}

export { StatusBadge, taskStatusLabels, workOrderStatusLabels, statusColorClasses };

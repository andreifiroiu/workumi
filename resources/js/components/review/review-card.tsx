import { cn } from '@/lib/utils';
import type { ReviewItem } from '@/types/review';
import {
    Briefcase,
    CalendarDays,
    CalendarOff,
    CalendarX,
    FolderOpen,
    UserX,
} from 'lucide-react';

interface ReviewCardProps {
    item: ReviewItem;
}

function isOverdue(dueDate: string | null): boolean {
    if (!dueDate) {
        return false;
    }

    return new Date(dueDate) < new Date(new Date().toDateString());
}

const priorityStyles: Record<string, string> = {
    urgent: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400',
    high: 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400',
    medium: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
    low: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
};

export function ReviewCard({ item }: ReviewCardProps) {
    return (
        <div
            key={item.id}
            className="w-full animate-in rounded-2xl border border-slate-200 bg-white p-6 shadow-sm duration-300 fade-in-0 slide-in-from-bottom-2 sm:p-8 dark:border-slate-800 dark:bg-slate-900"
        >
            <div className="mb-4 flex flex-wrap items-center gap-2">
                <span
                    className={cn(
                        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium capitalize',
                        priorityStyles[item.priority] ?? priorityStyles.low,
                    )}
                >
                    {item.priority}
                </span>
                <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                    {item.statusLabel}
                </span>
            </div>

            <h2 className="text-2xl leading-tight font-semibold text-slate-900 sm:text-3xl dark:text-white">
                {item.title}
            </h2>

            {item.description && (
                <p className="mt-3 line-clamp-3 text-sm text-slate-600 dark:text-slate-400">
                    {item.description}
                </p>
            )}

            <div className="mt-6 space-y-2 border-t border-slate-100 pt-4 text-sm dark:border-slate-800">
                {item.projectTitle && (
                    <ContextRow
                        icon={<FolderOpen className="h-4 w-4" />}
                        label="Project"
                        value={item.projectTitle}
                    />
                )}
                {item.workOrderTitle && (
                    <ContextRow
                        icon={<Briefcase className="h-4 w-4" />}
                        label="Work order"
                        value={item.workOrderTitle}
                    />
                )}
                <ContextRow
                    icon={
                        !item.dueDate ? (
                            <CalendarOff className="h-4 w-4" />
                        ) : isOverdue(item.dueDate) ? (
                            <CalendarX className="h-4 w-4" />
                        ) : (
                            <CalendarDays className="h-4 w-4" />
                        )
                    }
                    label="Due date"
                    value={
                        item.dueDate
                            ? isOverdue(item.dueDate)
                                ? `${item.dueDate} · overdue`
                                : item.dueDate
                            : 'Not set'
                    }
                    tone={
                        !item.dueDate
                            ? 'warning'
                            : isOverdue(item.dueDate)
                              ? 'danger'
                              : 'default'
                    }
                />
                <ContextRow
                    icon={
                        item.assignedTo ? (
                            <FolderOpen className="h-4 w-4" />
                        ) : (
                            <UserX className="h-4 w-4" />
                        )
                    }
                    label={
                        item.entityType === 'work_order' ? 'Owner' : 'Assignee'
                    }
                    value={item.assignedTo ?? 'Unassigned'}
                    tone={item.assignedTo ? 'default' : 'warning'}
                />
            </div>
        </div>
    );
}

const toneStyles: Record<'default' | 'warning' | 'danger', string> = {
    default: 'text-slate-900 dark:text-white',
    warning: 'text-amber-600 dark:text-amber-400',
    danger: 'text-red-600 dark:text-red-400',
};

function ContextRow({
    icon,
    label,
    value,
    tone = 'default',
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    tone?: 'default' | 'warning' | 'danger';
}) {
    return (
        <div className="flex items-center gap-2">
            <span
                className={
                    tone === 'default' ? 'text-slate-400' : toneStyles[tone]
                }
            >
                {icon}
            </span>
            <span className="w-24 shrink-0 text-slate-500 dark:text-slate-500">
                {label}
            </span>
            <span className={cn('truncate font-medium', toneStyles[tone])}>
                {value}
            </span>
        </div>
    );
}

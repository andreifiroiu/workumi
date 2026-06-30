import { cn } from '@/lib/utils';
import type { ReviewItem } from '@/types/review';
import { Briefcase, CalendarOff, FolderOpen, UserX } from 'lucide-react';

interface ReviewCardProps {
    item: ReviewItem;
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
                        item.dueDate ? (
                            <FolderOpen className="h-4 w-4" />
                        ) : (
                            <CalendarOff className="h-4 w-4" />
                        )
                    }
                    label="Due date"
                    value={item.dueDate ?? 'Not set'}
                    muted={!item.dueDate}
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
                    muted={!item.assignedTo}
                />
            </div>
        </div>
    );
}

function ContextRow({
    icon,
    label,
    value,
    muted,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    muted?: boolean;
}) {
    return (
        <div className="flex items-center gap-2">
            <span className="text-slate-400">{icon}</span>
            <span className="w-24 shrink-0 text-slate-500 dark:text-slate-500">
                {label}
            </span>
            <span
                className={cn(
                    'truncate font-medium',
                    muted
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-slate-900 dark:text-white',
                )}
            >
                {value}
            </span>
        </div>
    );
}

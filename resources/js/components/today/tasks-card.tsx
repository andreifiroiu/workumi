import { CheckSquare, ChevronRight, Clock, AlertCircle } from 'lucide-react';
import type { TodayTask } from '@/types/today';

interface TasksCardProps {
    tasks: TodayTask[];
    onViewTask?: (id: string) => void;
}

const priorityColors: Record<string, string> = {
    high: 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400',
    medium: 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400',
    low: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
};

const statusColors: Record<string, string> = {
    todo: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
    in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400',
    completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400',
};

const statusLabels: Record<string, string> = {
    todo: 'To Do',
    in_progress: 'In Progress',
    completed: 'Completed',
};

export function TasksCard({ tasks, onViewTask }: TasksCardProps) {
    // Sort tasks: overdue first, then due today, then by priority (high -> medium -> low)
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const dueOrder = (task: TodayTask) => (task.isOverdue ? 0 : task.isDueToday ? 1 : 2);
    const sortedTasks = [...tasks].sort((a, b) => {
        // Overdue items first, then tasks due today
        const dueDiff = dueOrder(a) - dueOrder(b);
        if (dueDiff !== 0) return dueDiff;
        // Then by priority
        return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    return (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-200 p-6 dark:border-slate-800">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400">
                        <CheckSquare className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Tasks Due</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Your tasks for today</p>
                    </div>
                </div>
            </div>

            <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {sortedTasks.length === 0 ? (
                    <div className="p-8 text-center">
                        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400">
                            <CheckSquare className="h-8 w-8" />
                        </div>
                        <p className="font-medium text-slate-600 dark:text-slate-400">No tasks due today</p>
                        <p className="text-sm text-slate-500 dark:text-slate-500">Enjoy your free time!</p>
                    </div>
                ) : (
                    sortedTasks.map((task) => (
                        <button
                            key={task.id}
                            onClick={() => onViewTask?.(task.id)}
                            className="group w-full p-4 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0 flex-1">
                                    <div className="mb-1 flex flex-wrap items-center gap-2">
                                        {task.isOverdue && (
                                            <span className="inline-flex items-center gap-1 rounded-md bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950/30 dark:text-red-400">
                                                <AlertCircle className="h-3 w-3" />
                                                Overdue
                                            </span>
                                        )}
                                        {!task.isOverdue && task.isDueToday && (
                                            <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
                                                <Clock className="h-3 w-3" />
                                                Due today
                                            </span>
                                        )}
                                        <span
                                            className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${statusColors[task.status]}`}
                                        >
                                            {statusLabels[task.status]}
                                        </span>
                                        <span
                                            className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium capitalize ${priorityColors[task.priority]}`}
                                        >
                                            {task.priority}
                                        </span>
                                    </div>
                                    <h4 className="mb-1 truncate font-medium text-slate-900 dark:text-white">
                                        {task.title}
                                    </h4>
                                    <p className="mb-2 line-clamp-1 text-sm text-slate-600 dark:text-slate-400">
                                        {task.description}
                                    </p>
                                    <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-500">
                                        <span>{task.projectTitle}</span>
                                        <span>•</span>
                                        <span className="flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {task.estimatedHours}h
                                        </span>
                                    </div>
                                </div>
                                <ChevronRight className="mt-1 h-5 w-5 flex-shrink-0 text-slate-400 transition-colors group-hover:text-slate-600 dark:group-hover:text-slate-300" />
                            </div>
                        </button>
                    ))
                )}
            </div>
        </div>
    );
}

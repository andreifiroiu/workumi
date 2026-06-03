import { Calendar, Clock, User, Briefcase, AlertCircle, CheckCircle, ExternalLink } from 'lucide-react';
import { Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import type { TodayTask } from '@/types/today';

interface TaskSheetProps {
    task: TodayTask | null;
    onClose: () => void;
    onCompleteTask?: (id: string) => void;
    onUpdateTask?: (id: string, status: TodayTask['status']) => void;
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

function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export function TaskSheet({ task, onClose, onCompleteTask, onUpdateTask }: TaskSheetProps) {
    const handleComplete = () => {
        if (task) {
            onCompleteTask?.(task.id);
        }
    };

    const handleStartTask = () => {
        if (task) {
            onUpdateTask?.(task.id, 'in_progress');
        }
    };

    return (
        <Sheet open={!!task} onOpenChange={(open) => !open && onClose()}>
            <SheetContent side="right" className="w-full sm:w-[500px]">
                {task && (
                    <>
                        <SheetHeader>
                            <div className="mb-2 flex flex-wrap items-center gap-2">
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
                                    {task.priority} priority
                                </span>
                            </div>
                            <SheetTitle>{task.title}</SheetTitle>
                            <SheetDescription>{task.description}</SheetDescription>
                        </SheetHeader>

                        <div className="mt-6 space-y-4">
                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                                <h4 className="mb-3 text-sm font-medium text-slate-900 dark:text-white">Details</h4>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 text-sm">
                                        <User className="h-4 w-4 text-slate-400" />
                                        <span className="text-slate-600 dark:text-slate-400">Assigned to:</span>
                                        <span className="font-medium text-slate-900 dark:text-white">
                                            {task.assignedTo}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm">
                                        <Calendar className="h-4 w-4 text-slate-400" />
                                        <span className="text-slate-600 dark:text-slate-400">Due:</span>
                                        <span
                                            className={`font-medium ${task.isOverdue ? 'text-red-600 dark:text-red-400' : !task.isOverdue && task.isDueToday ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'}`}
                                        >
                                            {formatDate(task.dueDate)}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm">
                                        <Clock className="h-4 w-4 text-slate-400" />
                                        <span className="text-slate-600 dark:text-slate-400">Estimated:</span>
                                        <span className="font-medium text-slate-900 dark:text-white">
                                            {task.estimatedHours} hours
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm">
                                        <Briefcase className="h-4 w-4 text-slate-400" />
                                        <span className="text-slate-600 dark:text-slate-400">Project:</span>
                                        <span className="font-medium text-slate-900 dark:text-white">
                                            {task.projectTitle}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm">
                                        <AlertCircle className="h-4 w-4 text-slate-400" />
                                        <span className="text-slate-600 dark:text-slate-400">Work Order:</span>
                                        <span className="font-medium text-slate-900 dark:text-white">
                                            {task.workOrderTitle}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <SheetFooter className="mt-6 flex flex-col gap-2">
                            <div className="flex gap-2">
                                {task.status === 'todo' && (
                                    <Button variant="outline" onClick={handleStartTask} className="flex-1">
                                        Start Task
                                    </Button>
                                )}
                                {task.status !== 'completed' && (
                                    <Button onClick={handleComplete} className="flex-1">
                                        <CheckCircle className="mr-2 h-4 w-4" />
                                        Mark Complete
                                    </Button>
                                )}
                                {task.status === 'completed' && (
                                    <Button variant="outline" onClick={onClose} className="flex-1">
                                        Close
                                    </Button>
                                )}
                            </div>
                            <Button variant="outline" asChild className="w-full">
                                <Link href={`/work/tasks/${task.id}`}>
                                    <ExternalLink className="mr-2 h-4 w-4" />
                                    View Full Details
                                </Link>
                            </Button>
                        </SheetFooter>
                    </>
                )}
            </SheetContent>
        </Sheet>
    );
}

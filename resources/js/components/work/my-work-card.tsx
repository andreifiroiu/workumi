import { Clock, AlertCircle, CheckCircle2, Building2, LayoutList, CheckSquare } from 'lucide-react';
import { Link } from '@inertiajs/react';
import { StatusBadge } from './status-badge';
import { ProgressBar } from './progress-bar';
import type { WorkOrder, Task } from '@/types/work';

interface MyWorkCardProps {
    workOrder?: WorkOrder;
    task?: Task;
}

export function MyWorkCard({ workOrder, task }: MyWorkCardProps) {
    if (workOrder) {
        return <WorkOrderCard workOrder={workOrder} />;
    }

    if (task) {
        return <TaskCard task={task} />;
    }

    return null;
}

function WorkOrderCard({ workOrder }: { workOrder: WorkOrder }) {
    const priorityColors: Record<string, string> = {
        low: 'border-l-muted',
        medium: 'border-l-amber-400 dark:border-l-amber-500',
        high: 'border-l-orange-500 dark:border-l-orange-500',
        urgent: 'border-l-red-500 dark:border-l-red-500',
    };

    const dueDate = workOrder.dueDate ? new Date(workOrder.dueDate) : null;
    const now = new Date();
    const daysUntilDue = dueDate ? Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
    const isOverdue = daysUntilDue !== null && daysUntilDue < 0;

    return (
        <Link
            href={`/work/work-orders/${workOrder.id}`}
            className={`block w-full text-left p-5 bg-card border border-border ${priorityColors[workOrder.priority]} border-l-4 rounded-lg hover:shadow-md transition-all group`}
        >
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <StatusBadge status={workOrder.status} type="workOrder" />
                        <span className="text-xs font-medium text-muted-foreground uppercase">
                            {workOrder.priority}
                        </span>
                        {workOrder.sopAttached && (
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-primary/10 text-primary">
                                SOP
                            </span>
                        )}
                    </div>
                    <h3 className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                        {workOrder.title}
                    </h3>
                    {workOrder.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                            {workOrder.description}
                        </p>
                    )}
                </div>
            </div>

            <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{workOrder.projectName}</span>
                </span>
                {workOrder.workOrderListName && (
                    <span className="flex items-center gap-1">
                        <LayoutList className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{workOrder.workOrderListName}</span>
                    </span>
                )}
                <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 shrink-0" />
                        {workOrder.actualHours}/{workOrder.estimatedHours}h
                    </span>
                    <div className="flex items-center gap-2">
                        {workOrder.tasksCount !== undefined && workOrder.tasksCount > 0 && (
                            <span className="flex items-center gap-1">
                                <CheckSquare className="h-3.5 w-3.5 shrink-0" />
                                {workOrder.completedTasksCount}/{workOrder.tasksCount}
                            </span>
                        )}
                        {daysUntilDue !== null && (
                            <span
                                className={`flex items-center gap-1 font-medium ${isOverdue ? 'text-destructive' : ''}`}
                            >
                                {isOverdue ? (
                                    <AlertCircle className="h-3.5 w-3.5" />
                                ) : (
                                    <Clock className="h-3.5 w-3.5" />
                                )}
                                {isOverdue ? `${Math.abs(daysUntilDue)}d overdue` : `${daysUntilDue}d left`}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {workOrder.acceptanceCriteria.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-xs text-muted-foreground mb-2">Acceptance Criteria:</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                        {workOrder.acceptanceCriteria.slice(0, 2).map((criteria, i) => (
                            <li key={i} className="flex items-start gap-2">
                                <span className="text-muted-foreground">•</span>
                                <span className="flex-1 line-clamp-1">{criteria}</span>
                            </li>
                        ))}
                        {workOrder.acceptanceCriteria.length > 2 && (
                            <li className="text-muted-foreground">
                                +{workOrder.acceptanceCriteria.length - 2} more
                            </li>
                        )}
                    </ul>
                </div>
            )}
        </Link>
    );
}

function TaskCard({ task }: { task: Task }) {
    const dueDate = task.dueDate ? new Date(task.dueDate) : null;
    const now = new Date();
    const daysUntilDue = dueDate ? Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
    const isOverdue = daysUntilDue !== null && daysUntilDue < 0;

    const completedItems = task.checklistItems.filter((item) => item.completed).length;
    const totalItems = task.checklistItems.length;
    const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

    return (
        <Link
            href={`/work/tasks/${task.id}`}
            className="block w-full text-left p-4 bg-card border border-border rounded-lg hover:shadow-md transition-all group"
        >
            <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <StatusBadge status={task.status} type="task" />
                        {task.isBlocked && (
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                Blocked
                            </span>
                        )}
                    </div>
                    <h4
                        className={`text-sm font-medium mb-1 group-hover:text-primary transition-colors ${
                            task.isBlocked ? 'line-through text-muted-foreground' : 'text-foreground'
                        }`}
                    >
                        {task.title}
                    </h4>
                    <p className="text-xs text-muted-foreground mb-2">{task.workOrderTitle}</p>
                </div>
            </div>

            {totalItems > 0 && (
                <div className="mb-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                        <span>
                            {completedItems}/{totalItems} checklist items
                        </span>
                        <span className="font-medium">{Math.round(progress)}%</span>
                    </div>
                    <ProgressBar progress={progress} />
                </div>
            )}

            <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {task.actualHours}/{task.estimatedHours}h
                </span>
                {task.status === 'done' ? (
                    <div className="flex items-center gap-1 font-medium">
                        <CheckCircle2 className="h-3 w-3" />
                        Completed
                    </div>
                ) : daysUntilDue !== null ? (
                    <div className={`flex items-center gap-1 font-medium ${isOverdue ? 'text-destructive' : ''}`}>
                        {isOverdue ? <AlertCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                        {isOverdue ? `${Math.abs(daysUntilDue)}d overdue` : `${daysUntilDue}d left`}
                    </div>
                ) : null}
            </div>
        </Link>
    );
}

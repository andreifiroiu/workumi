import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Link } from '@inertiajs/react';
import { CheckCircle2, User, AlertTriangle, Briefcase, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TaskKanbanCardProps {
    task: {
        id: string;
        title: string;
        status: string;
        assignedToName: string;
        isBlocked: boolean;
        checklistItems: Array<{ id: string; text: string; completed: boolean }>;
        workOrderTitle?: string;
        projectName?: string;
    };
    isDragOverlay?: boolean;
    onMarkDone?: (taskId: string) => void;
}

const CAN_MARK_DONE = new Set(['in_progress', 'approved']);

export function TaskKanbanCard({ task, isDragOverlay = false, onMarkDone }: TaskKanbanCardProps) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: task.id,
        data: {
            type: 'task',
            task,
        },
    });

    const style = transform
        ? {
              transform: CSS.Translate.toString(transform),
          }
        : undefined;

    const completedItems = task.checklistItems.filter((item) => item.completed).length;
    const totalItems = task.checklistItems.length;

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className={cn(
                'bg-card border-border rounded-lg border p-3 shadow-sm transition-all',
                'cursor-grab active:cursor-grabbing',
                'hover:border-primary/50 hover:shadow-md',
                isDragging && !isDragOverlay && 'opacity-50',
                isDragOverlay && 'shadow-lg ring-2 ring-primary/50 rotate-2'
            )}
        >
            <Link
                href={`/work/tasks/${task.id}`}
                className="block"
                onClick={(e) => {
                    // Prevent navigation while dragging
                    if (isDragging) {
                        e.preventDefault();
                    }
                }}
            >
                <div className="mb-2 flex items-start justify-between gap-2">
                    <span
                        className={cn(
                            'text-sm font-medium leading-tight',
                            task.status === 'done' && 'text-muted-foreground line-through'
                        )}
                    >
                        {task.title}
                    </span>
                    <div className="flex shrink-0 items-center gap-1">
                        {onMarkDone && CAN_MARK_DONE.has(task.status) && (
                            <button
                                type="button"
                                title="Mark as done"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onMarkDone(task.id);
                                }}
                                className="rounded p-0.5 text-muted-foreground hover:bg-emerald-100 hover:text-emerald-600 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-400"
                            >
                                <CheckCircle2 className="h-4 w-4" />
                            </button>
                        )}
                        {task.status === 'done' && (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        )}
                        {task.isBlocked && (
                            <AlertTriangle className="h-4 w-4 text-destructive" />
                        )}
                    </div>
                </div>

                {(task.projectName || task.workOrderTitle) && (
                    <div className="mb-2 flex flex-col gap-0.5 text-xs text-muted-foreground">
                        {task.projectName && (
                            <div className="flex items-center gap-1">
                                <Building2 className="h-3 w-3 shrink-0" />
                                <span className="truncate">{task.projectName}</span>
                            </div>
                        )}
                        {task.workOrderTitle && (
                            <div className="flex items-center gap-1">
                                <Briefcase className="h-3 w-3 shrink-0" />
                                <span className="truncate">{task.workOrderTitle}</span>
                            </div>
                        )}
                    </div>
                )}

                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {task.assignedToName && (
                        <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span>{task.assignedToName}</span>
                        </div>
                    )}
                    {totalItems > 0 && (
                        <span>
                            {completedItems}/{totalItems} items
                        </span>
                    )}
                </div>
            </Link>
        </div>
    );
}

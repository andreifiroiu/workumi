import { useDroppable } from '@dnd-kit/core';
import { TaskKanbanCard, type TaskKanbanCardProps } from './task-kanban-card';
import { cn } from '@/lib/utils';

export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'approved' | 'done' | 'blocked';

export interface TaskKanbanColumnProps {
    status: TaskStatus;
    title: string;
    tasks: TaskKanbanCardProps['task'][];
    isValidDropTarget: boolean;
    activeTaskId: string | null;
    onMarkDone?: (taskId: string) => void;
}

const statusColors: Record<TaskStatus, { header: string; badge: string }> = {
    todo: {
        header: 'border-slate-300 dark:border-slate-600',
        badge: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
    },
    in_progress: {
        header: 'border-indigo-400 dark:border-indigo-500',
        badge: 'bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300',
    },
    in_review: {
        header: 'border-amber-400 dark:border-amber-500',
        badge: 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300',
    },
    approved: {
        header: 'border-cyan-400 dark:border-cyan-500',
        badge: 'bg-cyan-100 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-300',
    },
    done: {
        header: 'border-emerald-400 dark:border-emerald-500',
        badge: 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300',
    },
    blocked: {
        header: 'border-red-400 dark:border-red-500',
        badge: 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300',
    },
};

export function TaskKanbanColumn({
    status,
    title,
    tasks,
    isValidDropTarget,
    activeTaskId,
    onMarkDone,
}: TaskKanbanColumnProps) {
    const { isOver, setNodeRef } = useDroppable({
        id: status,
        data: {
            type: 'column',
            status,
        },
    });

    const isDragging = activeTaskId !== null;
    const colors = statusColors[status];

    return (
        <div className="flex h-full min-w-[280px] max-w-[280px] shrink-0 flex-col">
            {/* Column Header */}
            <div
                className={cn(
                    'mb-3 flex items-center justify-between border-b-2 px-1 pb-2',
                    colors.header
                )}
            >
                <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-foreground">{title}</h3>
                    <span
                        className={cn(
                            'rounded-full px-2 py-0.5 text-xs font-medium',
                            colors.badge
                        )}
                    >
                        {tasks.length}
                    </span>
                </div>
            </div>

            {/* Column Content - Drop Zone */}
            <div
                ref={setNodeRef}
                className={cn(
                    'flex-1 space-y-2 overflow-y-auto rounded-lg border-2 border-dashed p-2 transition-all duration-200',
                    'min-h-[200px]',
                    // Default state
                    !isDragging && 'border-border bg-muted/30',
                    // While dragging - valid target
                    isDragging && isValidDropTarget && !isOver && 'border-primary/40 bg-primary/5',
                    // While dragging - invalid target
                    isDragging && !isValidDropTarget && 'border-muted bg-muted/20 opacity-50',
                    // Hovering over valid target
                    isDragging && isValidDropTarget && isOver && 'border-primary bg-primary/10 ring-2 ring-primary/30'
                )}
            >
                {tasks.length === 0 ? (
                    <div className="flex h-20 items-center justify-center text-xs text-muted-foreground">
                        {isDragging && isValidDropTarget
                            ? 'Drop here'
                            : 'No tasks'}
                    </div>
                ) : (
                    tasks.map((task) => (
                        <TaskKanbanCard key={task.id} task={task} onMarkDone={onMarkDone} />
                    ))
                )}
            </div>
        </div>
    );
}

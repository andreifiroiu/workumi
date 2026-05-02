import { useState, useCallback, useMemo } from 'react';
import {
    DndContext,
    DragOverlay,
    rectIntersection,
    PointerSensor,
    useSensor,
    useSensors,
    type DragStartEvent,
    type DragEndEvent,
} from '@dnd-kit/core';
import { router } from '@inertiajs/react';
import { CheckSquare } from 'lucide-react';
import { TaskKanbanColumn, type TaskStatus } from './task-kanban/task-kanban-column';
import { TaskKanbanCard } from './task-kanban/task-kanban-card';
import type { Task } from '@/types/work';

interface KanbanTasksViewProps {
    tasks: Task[];
}

const VALID_TRANSITIONS: Record<string, string[]> = {
    todo: ['in_progress', 'cancelled'],
    in_progress: ['in_review', 'done', 'blocked', 'cancelled'],
    in_review: ['approved', 'revision_requested', 'cancelled'],
    approved: ['done', 'revision_requested', 'cancelled'],
    done: [],
    blocked: ['in_progress', 'cancelled'],
    revision_requested: [],
    cancelled: [],
};

const VISIBLE_COLUMNS: { status: TaskStatus; title: string }[] = [
    { status: 'todo', title: 'To Do' },
    { status: 'in_progress', title: 'In Progress' },
    { status: 'in_review', title: 'In Review' },
    { status: 'approved', title: 'Approved' },
    { status: 'done', title: 'Done' },
    { status: 'blocked', title: 'Blocked' },
];

export function KanbanTasksView({ tasks }: KanbanTasksViewProps) {
    const [activeTask, setActiveTask] = useState<Task | null>(null);
    const [isTransitioning, setIsTransitioning] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
    );

    const tasksByStatus = useMemo(() => {
        const grouped: Record<string, typeof tasks> = {
            todo: [],
            in_progress: [],
            in_review: [],
            approved: [],
            done: [],
            blocked: [],
        };
        tasks.forEach((task) => {
            if (grouped[task.status]) {
                grouped[task.status].push(task);
            }
        });
        return grouped;
    }, [tasks]);

    const validDropTargets = useMemo(() => {
        if (!activeTask) return new Set<string>();
        return new Set(VALID_TRANSITIONS[activeTask.status] ?? []);
    }, [activeTask]);

    const handleDragStart = useCallback(
        (event: DragStartEvent) => {
            const task = tasks.find((t) => t.id === event.active.id);
            if (task) setActiveTask(task);
        },
        [tasks]
    );

    const handleDragEnd = useCallback(
        async (event: DragEndEvent) => {
            const { active, over } = event;
            setActiveTask(null);

            if (!over || isTransitioning) return;

            const task = tasks.find((t) => t.id === active.id);
            if (!task) return;

            const targetStatus = over.id as string;
            if (task.status === targetStatus) return;

            const validTargets = VALID_TRANSITIONS[task.status] ?? [];
            if (!validTargets.includes(targetStatus)) return;

            setIsTransitioning(true);
            try {
                const response = await fetch(`/work/tasks/${task.id}/transition`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-CSRF-TOKEN':
                            document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '',
                    },
                    body: JSON.stringify({ status: targetStatus }),
                });

                if (!response.ok) {
                    const data = await response.json();
                    console.error('Failed to transition task:', data.message);
                    return;
                }

                router.reload({ only: ['tasks'] });
            } catch (error) {
                console.error('Error transitioning task:', error);
            } finally {
                setIsTransitioning(false);
            }
        },
        [tasks, isTransitioning]
    );

    const handleDragCancel = useCallback(() => setActiveTask(null), []);

    const activeCount = tasks.filter((t) => t.status !== 'done' && t.status !== 'cancelled').length;

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={rectIntersection}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
        >
            <div className="space-y-6">
                {/* Summary */}
                <div className="flex items-center gap-6">
                    <div className="px-4 py-2 bg-card border border-border rounded-lg">
                        <div className="text-2xl font-bold text-foreground">
                            {activeCount}
                            <span className="text-sm font-normal text-muted-foreground ml-1">
                                / {tasks.length}
                            </span>
                        </div>
                        <div className="text-xs text-muted-foreground">Active Tasks</div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                        All tasks across your workspace. Drag cards between columns to update status.
                    </div>
                </div>

                {/* Board */}
                <div className="overflow-x-auto pb-4">
                    <div className="flex gap-4 min-w-max">
                        {VISIBLE_COLUMNS.map((column) => (
                            <TaskKanbanColumn
                                key={column.status}
                                status={column.status}
                                title={column.title}
                                tasks={(tasksByStatus[column.status] ?? []).map((t) => ({
                                    id: t.id,
                                    title: t.title,
                                    status: t.status,
                                    assignedToName: t.assignedToName,
                                    isBlocked: t.isBlocked,
                                    checklistItems: t.checklistItems,
                                    workOrderTitle: t.workOrderTitle,
                                    projectName: t.projectName,
                                }))}
                                isValidDropTarget={validDropTargets.has(column.status)}
                                activeTaskId={activeTask?.id ?? null}
                            />
                        ))}
                    </div>
                </div>

                {/* Empty state */}
                {tasks.length === 0 && (
                    <div className="bg-card border border-border rounded-xl p-12 text-center">
                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                            <CheckSquare className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-semibold text-foreground mb-2">No tasks yet</h3>
                        <p className="text-sm text-muted-foreground">
                            Tasks will appear here once they are created within work orders.
                        </p>
                    </div>
                )}

                {/* Drag tip */}
                {tasks.length > 0 && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted rounded-lg p-3">
                        <CheckSquare className="w-4 h-4 shrink-0" />
                        <span>
                            <strong>Tip:</strong> Drag cards between columns to update status. Click a card to view
                            details.
                        </span>
                    </div>
                )}
            </div>

            <DragOverlay>
                {activeTask ? (
                    <TaskKanbanCard
                        task={{
                            id: activeTask.id,
                            title: activeTask.title,
                            status: activeTask.status,
                            assignedToName: activeTask.assignedToName,
                            isBlocked: activeTask.isBlocked,
                            checklistItems: activeTask.checklistItems,
                            workOrderTitle: activeTask.workOrderTitle,
                            projectName: activeTask.projectName,
                        }}
                        isDragOverlay
                    />
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}

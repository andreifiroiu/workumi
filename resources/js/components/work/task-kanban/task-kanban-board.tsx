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
import { TaskKanbanColumn, type TaskStatus } from './task-kanban-column';
import { TaskKanbanCard, type TaskKanbanCardProps } from './task-kanban-card';
import { csrfHeaders } from '@/lib/csrf';

interface Task {
    id: string;
    title: string;
    description: string | null;
    status: string;
    dueDate: string | null;
    assignedToId: string | null;
    assignedToName: string;
    estimatedHours: number;
    actualHours: number;
    checklistItems: Array<{ id: string; text: string; completed: boolean }>;
    isBlocked: boolean;
    positionInWorkOrder: number;
}

export interface TaskKanbanBoardProps {
    tasks: Task[];
    workOrderId: string;
}

// Workflow transition rules based on WorkflowTransitionService.php
const VALID_TRANSITIONS: Record<string, string[]> = {
    todo: ['in_progress', 'cancelled'],
    in_progress: ['in_review', 'done', 'blocked', 'cancelled'],
    in_review: ['approved', 'revision_requested', 'cancelled'],
    approved: ['done', 'revision_requested', 'cancelled'],
    done: [], // terminal
    blocked: ['in_progress', 'cancelled'],
    revision_requested: [], // auto-transitions
    cancelled: [], // terminal
};

// Columns to display (excluding cancelled and revision_requested)
const VISIBLE_COLUMNS: { status: TaskStatus; title: string }[] = [
    { status: 'todo', title: 'To Do' },
    { status: 'in_progress', title: 'In Progress' },
    { status: 'in_review', title: 'In Review' },
    { status: 'approved', title: 'Approved' },
    { status: 'done', title: 'Done' },
    { status: 'blocked', title: 'Blocked' },
];

export function TaskKanbanBoard({ tasks, workOrderId }: TaskKanbanBoardProps) {
    const [activeTask, setActiveTask] = useState<Task | null>(null);
    const [isTransitioning, setIsTransitioning] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    // Group tasks by status
    const tasksByStatus = useMemo(() => {
        const grouped: Record<string, TaskKanbanCardProps['task'][]> = {
            todo: [],
            in_progress: [],
            in_review: [],
            approved: [],
            done: [],
            blocked: [],
        };

        tasks.forEach((task) => {
            const status = task.status as string;
            if (grouped[status]) {
                grouped[status].push({
                    id: task.id,
                    title: task.title,
                    status: task.status,
                    assignedToName: task.assignedToName,
                    isBlocked: task.isBlocked,
                    checklistItems: task.checklistItems,
                });
            }
        });

        return grouped;
    }, [tasks]);

    // Get valid drop targets for the currently dragged task
    const validDropTargets = useMemo(() => {
        if (!activeTask) return new Set<string>();
        const currentStatus = activeTask.status;
        const validTargets = VALID_TRANSITIONS[currentStatus] || [];
        return new Set(validTargets);
    }, [activeTask]);

    const handleDragStart = useCallback(
        (event: DragStartEvent) => {
            const taskId = event.active.id as string;
            const task = tasks.find((t) => t.id === taskId);
            if (task) {
                setActiveTask(task);
            }
        },
        [tasks]
    );

    const handleDragEnd = useCallback(
        async (event: DragEndEvent) => {
            const { active, over } = event;

            setActiveTask(null);

            if (!over || isTransitioning) return;

            const taskId = active.id as string;
            const task = tasks.find((t) => t.id === taskId);
            if (!task) return;

            const targetStatus = over.id as string;

            // Don't do anything if dropped on the same status
            if (task.status === targetStatus) return;

            // Check if transition is valid
            const validTargets = VALID_TRANSITIONS[task.status] || [];
            if (!validTargets.includes(targetStatus)) {
                return;
            }

            setIsTransitioning(true);

            try {
                const response = await fetch(`/work/tasks/${taskId}/transition`, {
                    method: 'POST',
                    headers: csrfHeaders(),
                    body: JSON.stringify({ status: targetStatus }),
                });

                if (!response.ok) {
                    const data = await response.json();
                    console.error('Failed to transition task:', data.message);
                    return;
                }

                // Reload tasks to get fresh data
                router.reload({ only: ['tasks'] });
            } catch (error) {
                console.error('Error transitioning task:', error);
            } finally {
                setIsTransitioning(false);
            }
        },
        [tasks, isTransitioning]
    );

    const handleDragCancel = useCallback(() => {
        setActiveTask(null);
    }, []);

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={rectIntersection}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
        >
            <div className="flex h-full gap-4 overflow-x-auto pb-4">
                {VISIBLE_COLUMNS.map((column) => (
                    <TaskKanbanColumn
                        key={column.status}
                        status={column.status}
                        title={column.title}
                        tasks={tasksByStatus[column.status] || []}
                        isValidDropTarget={validDropTargets.has(column.status)}
                        activeTaskId={activeTask?.id ?? null}
                    />
                ))}
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
                        }}
                        isDragOverlay
                    />
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}

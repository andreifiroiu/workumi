import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useIsMobile } from '@/hooks/use-mobile';
import { csrfHeaders } from '@/lib/csrf';
import type { Task } from '@/types/work';
import {
    DndContext,
    DragOverlay,
    PointerSensor,
    rectIntersection,
    useSensor,
    useSensors,
    type DragEndEvent,
    type DragStartEvent,
} from '@dnd-kit/core';
import { Link, router } from '@inertiajs/react';
import {
    ArrowRight,
    Briefcase,
    Building2,
    CheckSquare,
    EyeOff,
    User,
} from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { TaskKanbanCard } from './task-kanban/task-kanban-card';
import {
    TaskKanbanColumn,
    type TaskStatus,
} from './task-kanban/task-kanban-column';

interface KanbanTasksViewProps {
    tasks: Task[];
    searchQuery?: string;
}

const VALID_TRANSITIONS: Record<string, string[]> = {
    todo: ['in_progress', 'cancelled'],
    in_progress: ['in_review', 'done', 'blocked', 'cancelled'],
    in_review: ['approved', 'revision_requested', 'cancelled'],
    approved: ['done', 'revision_requested', 'cancelled'],
    done: ['in_progress', 'todo'],
    blocked: ['in_progress', 'cancelled'],
    revision_requested: [],
    cancelled: [],
};

const ALL_COLUMNS: { status: TaskStatus; title: string }[] = [
    { status: 'todo', title: 'To Do' },
    { status: 'in_progress', title: 'In Progress' },
    { status: 'in_review', title: 'In Review' },
    { status: 'approved', title: 'Approved' },
    { status: 'done', title: 'Done' },
    { status: 'blocked', title: 'Blocked' },
];

const STATUS_TITLES: Record<string, string> = {
    todo: 'To Do',
    in_progress: 'In Progress',
    in_review: 'In Review',
    approved: 'Approved',
    done: 'Done',
    blocked: 'Blocked',
    revision_requested: 'Revision Requested',
    cancelled: 'Cancelled',
};

async function transitionTask(
    taskId: string,
    status: string,
): Promise<boolean> {
    const response = await fetch(`/work/tasks/${taskId}/transition`, {
        method: 'POST',
        headers: csrfHeaders(),
        body: JSON.stringify({ status }),
    });

    if (!response.ok) {
        const data = await response.json();
        console.error('Failed to transition task:', data.message);
        return false;
    }
    return true;
}

export function KanbanTasksView({
    tasks,
    searchQuery = '',
}: KanbanTasksViewProps) {
    const isMobile = useIsMobile();
    const [activeTask, setActiveTask] = useState<Task | null>(null);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [hideCompleted, setHideCompleted] = useState(false);
    const [mobileStatus, setMobileStatus] = useState<TaskStatus>('todo');
    // optimistic: taskId → overridden status
    const [optimisticStatuses, setOptimisticStatuses] = useState<
        Record<string, string>
    >({});

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    );

    const effectiveStatus = useCallback(
        (task: Task) => optimisticStatuses[task.id] ?? task.status,
        [optimisticStatuses],
    );

    const visibleColumns = useMemo(
        () =>
            hideCompleted
                ? ALL_COLUMNS.filter((c) => c.status !== 'done')
                : ALL_COLUMNS,
        [hideCompleted],
    );

    const filteredTasks = useMemo(() => {
        if (!searchQuery.trim()) return tasks;
        const q = searchQuery.toLowerCase();
        return tasks.filter(
            (t) =>
                t.title.toLowerCase().includes(q) ||
                (t.workOrderTitle?.toLowerCase().includes(q) ?? false) ||
                (t.projectName?.toLowerCase().includes(q) ?? false) ||
                t.assignedToName.toLowerCase().includes(q),
        );
    }, [tasks, searchQuery]);

    const visibleTasks = useMemo(
        () =>
            hideCompleted
                ? filteredTasks.filter((t) => effectiveStatus(t) !== 'done')
                : filteredTasks,
        [filteredTasks, hideCompleted, effectiveStatus],
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
        visibleTasks.forEach((task) => {
            const status = effectiveStatus(task);
            if (grouped[status]) {
                grouped[status].push(task);
            }
        });
        return grouped;
    }, [visibleTasks, effectiveStatus]);

    const validDropTargets = useMemo(() => {
        if (!activeTask) return new Set<string>();
        return new Set(VALID_TRANSITIONS[effectiveStatus(activeTask)] ?? []);
    }, [activeTask, effectiveStatus]);

    const handleDragStart = useCallback(
        (event: DragStartEvent) => {
            const task = tasks.find((t) => t.id === event.active.id);
            if (task) setActiveTask(task);
        },
        [tasks],
    );

    const moveTask = useCallback(
        async (taskId: string, currentStatus: string, targetStatus: string) => {
            if (isTransitioning || currentStatus === targetStatus) return;

            const validTargets = VALID_TRANSITIONS[currentStatus] ?? [];
            if (!validTargets.includes(targetStatus)) return;

            // Move card immediately
            setOptimisticStatuses((prev) => ({
                ...prev,
                [taskId]: targetStatus,
            }));

            setIsTransitioning(true);
            try {
                const ok = await transitionTask(taskId, targetStatus);
                if (ok) {
                    router.reload({ only: ['tasks'] });
                } else {
                    // Revert on failure
                    setOptimisticStatuses((prev) => {
                        const next = { ...prev };
                        delete next[taskId];
                        return next;
                    });
                }
            } finally {
                setIsTransitioning(false);
            }
        },
        [isTransitioning],
    );

    const handleDragEnd = useCallback(
        (event: DragEndEvent) => {
            const { active, over } = event;
            setActiveTask(null);

            if (!over) return;

            const task = tasks.find((t) => t.id === active.id);
            if (!task) return;

            void moveTask(task.id, effectiveStatus(task), over.id as string);
        },
        [tasks, effectiveStatus, moveTask],
    );

    const handleMarkDone = useCallback(
        (taskId: string) => {
            const task = tasks.find((t) => t.id === taskId);
            if (!task) return;
            void moveTask(taskId, effectiveStatus(task), 'done');
        },
        [tasks, effectiveStatus, moveTask],
    );

    const handleDragCancel = useCallback(() => setActiveTask(null), []);

    const activeCount = filteredTasks.filter(
        (t) =>
            effectiveStatus(t) !== 'done' && effectiveStatus(t) !== 'cancelled',
    ).length;
    const doneCount = filteredTasks.filter(
        (t) => effectiveStatus(t) === 'done',
    ).length;

    const summaryHeader = (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
                <div className="inline-block rounded-lg border border-border bg-card px-4 py-2">
                    <div className="text-2xl font-bold text-foreground">
                        {activeCount}
                        <span className="ml-1 text-sm font-normal text-muted-foreground">
                            / {filteredTasks.length}
                        </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                        Active Tasks
                    </div>
                </div>
                <div className="hidden text-xs text-muted-foreground sm:block">
                    All tasks across your workspace. Drag cards between columns
                    to update status.
                </div>
            </div>

            {doneCount > 0 && (
                <button
                    type="button"
                    onClick={() => setHideCompleted((v) => !v)}
                    className={`flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors sm:w-auto ${
                        hideCompleted
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                    }`}
                >
                    <EyeOff className="h-3.5 w-3.5" />
                    Hide completed{hideCompleted && ` (${doneCount})`}
                </button>
            )}
        </div>
    );

    const emptyState = (
        <div className="rounded-xl border border-border bg-card p-8 text-center sm:p-12">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <CheckSquare className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-foreground">
                No tasks yet
            </h3>
            <p className="text-sm text-muted-foreground">
                Tasks will appear here once they are created within work orders.
            </p>
        </div>
    );

    // Mobile: status-pill selector + single full-width column with explicit move actions
    if (isMobile) {
        const selectedTasks = (tasksByStatus[mobileStatus] ?? []).map((t) => ({
            ...t,
            effective: effectiveStatus(t),
        }));

        return (
            <div className="space-y-4">
                {summaryHeader}

                {tasks.length === 0 ? (
                    emptyState
                ) : (
                    <>
                        {/* Status selector */}
                        <Select
                            value={mobileStatus}
                            onValueChange={(value) =>
                                setMobileStatus(value as TaskStatus)
                            }
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {visibleColumns.map((column) => (
                                    <SelectItem
                                        key={column.status}
                                        value={column.status}
                                    >
                                        {column.title} (
                                        {
                                            (tasksByStatus[column.status] ?? [])
                                                .length
                                        }
                                        )
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Selected column tasks */}
                        <div className="space-y-3">
                            {selectedTasks.length === 0 ? (
                                <div className="flex items-center justify-center rounded-lg border border-dashed border-border py-10 text-sm text-muted-foreground">
                                    No tasks in {STATUS_TITLES[mobileStatus]}
                                </div>
                            ) : (
                                selectedTasks.map((task) => {
                                    const targets =
                                        VALID_TRANSITIONS[task.effective] ?? [];
                                    const completed =
                                        task.checklistItems.filter(
                                            (i) => i.completed,
                                        ).length;
                                    return (
                                        <div
                                            key={task.id}
                                            className="space-y-2 rounded-lg border border-border bg-card p-3 shadow-sm"
                                        >
                                            <Link
                                                href={`/work/tasks/${task.id}`}
                                                className="block text-sm leading-tight font-medium text-foreground"
                                            >
                                                {task.title}
                                            </Link>
                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                                {task.projectName && (
                                                    <span className="flex items-center gap-1">
                                                        <Building2 className="h-3 w-3 shrink-0" />
                                                        <span className="truncate">
                                                            {task.projectName}
                                                        </span>
                                                    </span>
                                                )}
                                                {task.workOrderTitle && (
                                                    <span className="flex items-center gap-1">
                                                        <Briefcase className="h-3 w-3 shrink-0" />
                                                        <span className="truncate">
                                                            {
                                                                task.workOrderTitle
                                                            }
                                                        </span>
                                                    </span>
                                                )}
                                                {task.assignedToName && (
                                                    <span className="flex items-center gap-1">
                                                        <User className="h-3 w-3" />
                                                        {task.assignedToName}
                                                    </span>
                                                )}
                                                {task.checklistItems.length >
                                                    0 && (
                                                    <span>
                                                        {completed}/
                                                        {
                                                            task.checklistItems
                                                                .length
                                                        }{' '}
                                                        items
                                                    </span>
                                                )}
                                            </div>
                                            {targets.length > 0 && (
                                                <div className="flex flex-wrap gap-2 pt-1">
                                                    {targets.map((target) => (
                                                        <Button
                                                            key={target}
                                                            size="sm"
                                                            variant="outline"
                                                            disabled={
                                                                isTransitioning
                                                            }
                                                            onClick={() =>
                                                                moveTask(
                                                                    task.id,
                                                                    task.effective,
                                                                    target,
                                                                )
                                                            }
                                                            className="h-8"
                                                        >
                                                            <ArrowRight className="h-3.5 w-3.5" />
                                                            {
                                                                STATUS_TITLES[
                                                                    target
                                                                ]
                                                            }
                                                        </Button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </>
                )}
            </div>
        );
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={rectIntersection}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
        >
            <div className="space-y-6">
                {summaryHeader}

                {/* Board */}
                <div className="overflow-x-auto pb-4">
                    <div className="flex min-w-max gap-4">
                        {visibleColumns.map((column) => (
                            <TaskKanbanColumn
                                key={column.status}
                                status={column.status}
                                title={column.title}
                                tasks={(tasksByStatus[column.status] ?? []).map(
                                    (t) => ({
                                        id: t.id,
                                        title: t.title,
                                        status: effectiveStatus(t),
                                        assignedToName: t.assignedToName,
                                        isBlocked: t.isBlocked,
                                        checklistItems: t.checklistItems,
                                        workOrderTitle: t.workOrderTitle,
                                        projectName: t.projectName,
                                    }),
                                )}
                                isValidDropTarget={validDropTargets.has(
                                    column.status,
                                )}
                                activeTaskId={activeTask?.id ?? null}
                                onMarkDone={handleMarkDone}
                            />
                        ))}
                    </div>
                </div>

                {/* Empty state */}
                {tasks.length === 0 && emptyState}

                {/* Tip */}
                {tasks.length > 0 && (
                    <div className="flex items-center gap-2 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
                        <CheckSquare className="h-4 w-4 shrink-0" />
                        <span>
                            <strong>Tip:</strong> Drag cards between columns to
                            update status, or click the{' '}
                            <CheckSquare className="inline h-3 w-3" /> icon on a
                            card to mark it done directly.
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
                            status: effectiveStatus(activeTask),
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

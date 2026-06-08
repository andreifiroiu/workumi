import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useIsMobile } from '@/hooks/use-mobile';
import { csrfHeaders } from '@/lib/csrf';
import type { Task, WorkOrder } from '@/types/work';
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
import { router } from '@inertiajs/react';
import {
    ArrowRight,
    Briefcase,
    CheckSquare,
    GripHorizontal,
    Search,
} from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { KanbanCard } from './kanban-card';
import { KanbanColumn } from './kanban-column';
import { KanbanTasksView } from './kanban-tasks-view';
import { MyWorkCard } from './my-work-card';

type KanbanSubtab = 'work_orders' | 'tasks';

interface KanbanViewProps {
    workOrders: WorkOrder[];
    tasks: Task[];
    onCreateWorkOrder: (status: WorkOrder['status']) => void;
}

const VALID_TRANSITIONS: Record<string, string[]> = {
    draft: ['active'],
    active: ['in_review', 'delivered'],
    in_review: ['approved'],
    approved: ['delivered'],
    delivered: [],
    blocked: ['active'],
};

const COLUMNS: Array<{ status: WorkOrder['status']; title: string }> = [
    { status: 'draft', title: 'Draft' },
    { status: 'active', title: 'Active' },
    { status: 'in_review', title: 'In Review' },
    { status: 'approved', title: 'Approved' },
    { status: 'delivered', title: 'Delivered' },
];

const STATUS_TITLES: Record<string, string> = Object.fromEntries(
    COLUMNS.map((column) => [column.status, column.title]),
);

export function KanbanView({
    workOrders,
    tasks,
    onCreateWorkOrder,
}: KanbanViewProps) {
    const isMobile = useIsMobile();
    const [subtab, setSubtab] = useState<KanbanSubtab>('work_orders');
    const [searchQuery, setSearchQuery] = useState('');
    const [mobileStatus, setMobileStatus] =
        useState<WorkOrder['status']>('active');
    const [activeWorkOrder, setActiveWorkOrder] = useState<WorkOrder | null>(
        null,
    );
    const [isTransitioning, setIsTransitioning] = useState(false);
    // optimistic: workOrderId → overridden status
    const [optimisticStatuses, setOptimisticStatuses] = useState<
        Record<string, string>
    >({});

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 8 },
        }),
    );

    const filteredWorkOrders = useMemo(() => {
        if (!searchQuery.trim()) return workOrders;
        const q = searchQuery.toLowerCase();
        return workOrders.filter(
            (wo) =>
                wo.title.toLowerCase().includes(q) ||
                wo.projectName.toLowerCase().includes(q) ||
                (wo.workOrderListName?.toLowerCase().includes(q) ?? false) ||
                wo.assignedToName.toLowerCase().includes(q),
        );
    }, [workOrders, searchQuery]);

    const workOrdersByStatus = useMemo(
        () =>
            COLUMNS.map((column) => ({
                ...column,
                workOrders: filteredWorkOrders
                    .filter(
                        (wo) =>
                            (optimisticStatuses[wo.id] ?? wo.status) ===
                            column.status,
                    )
                    .sort((a, b) => {
                        const priorityOrder = {
                            urgent: 0,
                            high: 1,
                            medium: 2,
                            low: 3,
                        };
                        const diff =
                            priorityOrder[a.priority] -
                            priorityOrder[b.priority];
                        if (diff !== 0) return diff;
                        if (!a.dueDate && !b.dueDate) return 0;
                        if (!a.dueDate) return 1;
                        if (!b.dueDate) return -1;
                        return (
                            new Date(a.dueDate).getTime() -
                            new Date(b.dueDate).getTime()
                        );
                    }),
            })),
        [filteredWorkOrders, optimisticStatuses],
    );

    const validDropTargets = useMemo(() => {
        if (!activeWorkOrder) return new Set<string>();
        const status =
            optimisticStatuses[activeWorkOrder.id] ?? activeWorkOrder.status;
        return new Set(VALID_TRANSITIONS[status] ?? []);
    }, [activeWorkOrder, optimisticStatuses]);

    const handleDragStart = useCallback(
        (event: DragStartEvent) => {
            const workOrder = workOrders.find(
                (wo) => wo.id === event.active.id,
            );
            if (workOrder) setActiveWorkOrder(workOrder);
        },
        [workOrders],
    );

    const moveWorkOrder = useCallback(
        async (
            workOrderId: string,
            currentStatus: string,
            targetStatus: string,
        ) => {
            if (isTransitioning || currentStatus === targetStatus) return;

            const validTargets = VALID_TRANSITIONS[currentStatus] ?? [];
            if (!validTargets.includes(targetStatus)) return;

            // Move card immediately
            setOptimisticStatuses((prev) => ({
                ...prev,
                [workOrderId]: targetStatus,
            }));

            const revert = () =>
                setOptimisticStatuses((prev) => {
                    const next = { ...prev };
                    delete next[workOrderId];
                    return next;
                });

            setIsTransitioning(true);
            try {
                const response = await fetch(
                    `/work/work-orders/${workOrderId}/transition`,
                    {
                        method: 'POST',
                        headers: csrfHeaders(),
                        body: JSON.stringify({ status: targetStatus }),
                    },
                );

                if (!response.ok) {
                    const data = await response.json();
                    console.error(
                        'Failed to transition work order:',
                        data.message,
                    );
                    revert();
                    return;
                }

                router.reload({ only: ['workOrders'] });
            } catch (error) {
                console.error('Error transitioning work order:', error);
                revert();
            } finally {
                setIsTransitioning(false);
            }
        },
        [isTransitioning],
    );

    const handleDragEnd = useCallback(
        (event: DragEndEvent) => {
            const { active, over } = event;
            setActiveWorkOrder(null);

            if (!over) return;

            const workOrder = workOrders.find((wo) => wo.id === active.id);
            if (!workOrder) return;

            const currentStatus =
                optimisticStatuses[workOrder.id] ?? workOrder.status;
            void moveWorkOrder(workOrder.id, currentStatus, over.id as string);
        },
        [workOrders, optimisticStatuses, moveWorkOrder],
    );

    const handleDragCancel = useCallback(() => {
        setActiveWorkOrder(null);
    }, []);

    const totalWorkOrders = filteredWorkOrders.length;
    const activeCount = filteredWorkOrders.filter(
        (wo) => wo.status !== 'delivered',
    ).length;

    return (
        <div className="space-y-6">
            {/* Sub-tab toggle */}
            <div className="flex items-center gap-2">
                <button
                    onClick={() => setSubtab('work_orders')}
                    className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                        subtab === 'work_orders'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                    }`}
                >
                    <Briefcase className="h-4 w-4" />
                    Work Orders
                </button>
                <button
                    onClick={() => setSubtab('tasks')}
                    className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                        subtab === 'tasks'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                    }`}
                >
                    <CheckSquare className="h-4 w-4" />
                    Tasks
                </button>
            </div>

            {/* Search bar */}
            <div className="relative max-w-sm">
                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={
                        subtab === 'tasks'
                            ? 'Search tasks…'
                            : 'Search work orders…'
                    }
                    className="pl-9"
                />
            </div>

            {/* Tasks board */}
            {subtab === 'tasks' && (
                <KanbanTasksView tasks={tasks} searchQuery={searchQuery} />
            )}

            {/* Work Orders board — mobile: status-pill single column with explicit move actions */}
            {subtab === 'work_orders' && isMobile && (
                <div className="space-y-4">
                    {/* Summary Stats */}
                    <div className="inline-block rounded-lg border border-border bg-card px-4 py-2">
                        <div className="text-2xl font-bold text-foreground">
                            {activeCount}
                            <span className="ml-1 text-sm font-normal text-muted-foreground">
                                / {totalWorkOrders}
                            </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                            Active Work Orders
                        </div>
                    </div>

                    {totalWorkOrders === 0 ? (
                        <div className="rounded-xl border border-border bg-card p-8 text-center">
                            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                                <GripHorizontal className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <h3 className="mb-2 text-lg font-semibold text-foreground">
                                No work orders yet
                            </h3>
                            <p className="mb-6 text-sm text-muted-foreground">
                                Create your first work order to get started.
                            </p>
                            <Button onClick={() => onCreateWorkOrder('draft')}>
                                Create Work Order
                            </Button>
                        </div>
                    ) : (
                        <>
                            {/* Status selector */}
                            <Select
                                value={mobileStatus}
                                onValueChange={(value) =>
                                    setMobileStatus(
                                        value as WorkOrder['status'],
                                    )
                                }
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {workOrdersByStatus.map((column) => (
                                        <SelectItem
                                            key={column.status}
                                            value={column.status}
                                        >
                                            {column.title} (
                                            {column.workOrders.length})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {/* Selected column cards */}
                            <div className="space-y-3">
                                {(
                                    workOrdersByStatus.find(
                                        (c) => c.status === mobileStatus,
                                    )?.workOrders ?? []
                                ).length === 0 ? (
                                    <div className="flex items-center justify-center rounded-lg border border-dashed border-border py-10 text-sm text-muted-foreground">
                                        No work orders in{' '}
                                        {STATUS_TITLES[mobileStatus]}
                                    </div>
                                ) : (
                                    (
                                        workOrdersByStatus.find(
                                            (c) => c.status === mobileStatus,
                                        )?.workOrders ?? []
                                    ).map((wo) => {
                                        const currentStatus =
                                            optimisticStatuses[wo.id] ??
                                            wo.status;
                                        const targets =
                                            VALID_TRANSITIONS[currentStatus] ??
                                            [];
                                        return (
                                            <div
                                                key={wo.id}
                                                className="space-y-2"
                                            >
                                                <MyWorkCard workOrder={wo} />
                                                {targets.length > 0 && (
                                                    <div className="flex flex-wrap gap-2">
                                                        {targets.map(
                                                            (target) => (
                                                                <Button
                                                                    key={target}
                                                                    size="sm"
                                                                    variant="outline"
                                                                    disabled={
                                                                        isTransitioning
                                                                    }
                                                                    onClick={() =>
                                                                        moveWorkOrder(
                                                                            wo.id,
                                                                            currentStatus,
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
                                                            ),
                                                        )}
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
            )}

            {/* Work Orders board — desktop: drag-and-drop board */}
            {subtab === 'work_orders' && !isMobile && (
                <DndContext
                    sensors={sensors}
                    collisionDetection={rectIntersection}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onDragCancel={handleDragCancel}
                >
                    <div className="space-y-6">
                        {/* Summary Stats */}
                        <div className="flex items-center gap-6">
                            <div className="rounded-lg border border-border bg-card px-4 py-2">
                                <div className="text-2xl font-bold text-foreground">
                                    {activeCount}
                                    <span className="ml-1 text-sm font-normal text-muted-foreground">
                                        / {totalWorkOrders}
                                    </span>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    Active Work Orders
                                </div>
                            </div>

                            <div className="text-xs text-muted-foreground">
                                Organize work orders by status. Drag cards
                                between columns to update status, or use the +
                                button to create new work orders.
                            </div>
                        </div>

                        {/* Kanban Board */}
                        <div className="overflow-x-auto pb-4">
                            <div className="flex min-w-max gap-4">
                                {workOrdersByStatus.map((column) => (
                                    <KanbanColumn
                                        key={column.status}
                                        status={column.status}
                                        title={column.title}
                                        workOrders={column.workOrders}
                                        onCreateWorkOrder={() =>
                                            onCreateWorkOrder(column.status)
                                        }
                                        isValidDropTarget={validDropTargets.has(
                                            column.status,
                                        )}
                                        activeWorkOrderId={
                                            activeWorkOrder?.id ?? null
                                        }
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Empty State */}
                        {totalWorkOrders === 0 && (
                            <div className="rounded-xl border border-border bg-card p-12 text-center">
                                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                                    <GripHorizontal className="h-8 w-8 text-muted-foreground" />
                                </div>
                                <h3 className="mb-2 text-lg font-semibold text-foreground">
                                    No work orders yet
                                </h3>
                                <p className="mb-6 text-sm text-muted-foreground">
                                    Create your first work order to get started
                                    with the kanban board.
                                </p>
                                <Button
                                    onClick={() => onCreateWorkOrder('draft')}
                                >
                                    Create Work Order
                                </Button>
                            </div>
                        )}

                        {/* Drag tip */}
                        {totalWorkOrders > 0 && (
                            <div className="flex items-center gap-2 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
                                <GripHorizontal className="h-4 w-4 shrink-0" />
                                <span>
                                    <strong>Tip:</strong> Drag cards between
                                    columns to update status. Click a card to
                                    view details.
                                </span>
                            </div>
                        )}
                    </div>

                    <DragOverlay>
                        {activeWorkOrder ? (
                            <KanbanCard workOrder={activeWorkOrder} isOverlay />
                        ) : null}
                    </DragOverlay>
                </DndContext>
            )}
        </div>
    );
}

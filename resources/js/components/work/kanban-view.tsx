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
import { GripHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { KanbanColumn } from './kanban-column';
import { KanbanCard } from './kanban-card';
import type { WorkOrder } from '@/types/work';

interface KanbanViewProps {
    workOrders: WorkOrder[];
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

export function KanbanView({ workOrders, onCreateWorkOrder }: KanbanViewProps) {
    const [activeWorkOrder, setActiveWorkOrder] = useState<WorkOrder | null>(null);
    const [isTransitioning, setIsTransitioning] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 8 },
        })
    );

    const workOrdersByStatus = useMemo(
        () =>
            COLUMNS.map((column) => ({
                ...column,
                workOrders: workOrders
                    .filter((wo) => wo.status === column.status)
                    .sort((a, b) => {
                        const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
                        const diff = priorityOrder[a.priority] - priorityOrder[b.priority];
                        if (diff !== 0) return diff;
                        if (!a.dueDate && !b.dueDate) return 0;
                        if (!a.dueDate) return 1;
                        if (!b.dueDate) return -1;
                        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
                    }),
            })),
        [workOrders]
    );

    const validDropTargets = useMemo(() => {
        if (!activeWorkOrder) return new Set<string>();
        return new Set(VALID_TRANSITIONS[activeWorkOrder.status] ?? []);
    }, [activeWorkOrder]);

    const handleDragStart = useCallback(
        (event: DragStartEvent) => {
            const workOrder = workOrders.find((wo) => wo.id === event.active.id);
            if (workOrder) setActiveWorkOrder(workOrder);
        },
        [workOrders]
    );

    const handleDragEnd = useCallback(
        async (event: DragEndEvent) => {
            const { active, over } = event;
            setActiveWorkOrder(null);

            if (!over || isTransitioning) return;

            const workOrder = workOrders.find((wo) => wo.id === active.id);
            if (!workOrder) return;

            const targetStatus = over.id as string;
            if (workOrder.status === targetStatus) return;

            const validTargets = VALID_TRANSITIONS[workOrder.status] ?? [];
            if (!validTargets.includes(targetStatus)) return;

            setIsTransitioning(true);
            try {
                const response = await fetch(`/work/work-orders/${workOrder.id}/transition`, {
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
                    console.error('Failed to transition work order:', data.message);
                    return;
                }

                router.reload({ only: ['workOrders'] });
            } catch (error) {
                console.error('Error transitioning work order:', error);
            } finally {
                setIsTransitioning(false);
            }
        },
        [workOrders, isTransitioning]
    );

    const handleDragCancel = useCallback(() => {
        setActiveWorkOrder(null);
    }, []);

    const totalWorkOrders = workOrders.length;
    const activeCount = workOrders.filter((wo) => wo.status !== 'delivered').length;

    return (
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
                    <div className="px-4 py-2 bg-card border border-border rounded-lg">
                        <div className="text-2xl font-bold text-foreground">
                            {activeCount}
                            <span className="text-sm font-normal text-muted-foreground ml-1">
                                / {totalWorkOrders}
                            </span>
                        </div>
                        <div className="text-xs text-muted-foreground">Active Work Orders</div>
                    </div>

                    <div className="text-xs text-muted-foreground">
                        Organize work orders by status. Drag cards between columns to update status, or use the +
                        button to create new work orders.
                    </div>
                </div>

                {/* Kanban Board */}
                <div className="overflow-x-auto pb-4">
                    <div className="flex gap-4 min-w-max">
                        {workOrdersByStatus.map((column) => (
                            <KanbanColumn
                                key={column.status}
                                status={column.status}
                                title={column.title}
                                workOrders={column.workOrders}
                                onCreateWorkOrder={() => onCreateWorkOrder(column.status)}
                                isValidDropTarget={validDropTargets.has(column.status)}
                                activeWorkOrderId={activeWorkOrder?.id ?? null}
                            />
                        ))}
                    </div>
                </div>

                {/* Empty State */}
                {totalWorkOrders === 0 && (
                    <div className="bg-card border border-border rounded-xl p-12 text-center">
                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                            <GripHorizontal className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-semibold text-foreground mb-2">No work orders yet</h3>
                        <p className="text-sm text-muted-foreground mb-6">
                            Create your first work order to get started with the kanban board.
                        </p>
                        <Button onClick={() => onCreateWorkOrder('draft')}>Create Work Order</Button>
                    </div>
                )}

                {/* Drag tip */}
                {totalWorkOrders > 0 && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted rounded-lg p-3">
                        <GripHorizontal className="w-4 h-4 shrink-0" />
                        <span>
                            <strong>Tip:</strong> Drag cards between columns to update status. Click a card to view
                            details.
                        </span>
                    </div>
                )}
            </div>

            <DragOverlay>
                {activeWorkOrder ? <KanbanCard workOrder={activeWorkOrder} isOverlay /> : null}
            </DragOverlay>
        </DndContext>
    );
}

import { useState, useEffect, useRef } from 'react';
import { router } from '@inertiajs/react';
import {
    DndContext,
    DragOverlay,
    rectIntersection,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragStartEvent,
    DragEndEvent,
    DragOverEvent,
    DragCancelEvent,
} from '@dnd-kit/core';
import {
    SortableContext,
    verticalListSortingStrategy,
    arrayMove,
} from '@dnd-kit/sortable';
import { Plus, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WorkOrderListGroup } from './work-order-list-group';
import { WorkOrderListItem } from './work-order-list-item';
import { CreateListDialog } from './create-list-dialog';
import type { WorkOrderList, WorkOrderInList } from '@/types/work';

interface WorkOrderListSectionProps {
    projectId: string;
    projectName: string;
    projectPartyId: string;
    parties: Array<{ id: string; name: string }>;
    workOrderLists: WorkOrderList[];
    ungroupedWorkOrders: WorkOrderInList[];
    onCreateWorkOrder: (listId?: string) => void;
    onBulkArchiveDelivered?: () => void;
}

export function WorkOrderListSection({
    projectId,
    projectName,
    projectPartyId,
    parties,
    workOrderLists,
    ungroupedWorkOrders,
    onCreateWorkOrder,
    onBulkArchiveDelivered,
}: WorkOrderListSectionProps) {
    const [createListDialogOpen, setCreateListDialogOpen] = useState(false);
    const [showArchived, setShowArchived] = useState(false);
    const [activeItem, setActiveItem] = useState<WorkOrderInList | null>(null);
    const [lists, setLists] = useState(workOrderLists);
    const [ungrouped, setUngrouped] = useState(ungroupedWorkOrders);
    // Track which container is being hovered over for visual highlighting
    const [overContainerId, setOverContainerId] = useState<string | null>(null);

    // Track the original container when drag starts (for cross-container moves)
    const sourceContainerRef = useRef<string | null>(null);
    // Track the current container during drag (to handle rapid dragOver calls)
    const currentContainerRef = useRef<string | null>(null);
    // Track whether we're currently dragging (to prevent state sync during drag)
    const isDraggingRef = useRef(false);

    // Sync props to local state when Inertia updates them (only when not dragging)
    useEffect(() => {
        if (!isDraggingRef.current) {
            setLists(workOrderLists);
        }
    }, [workOrderLists]);

    useEffect(() => {
        if (!isDraggingRef.current) {
            setUngrouped(ungroupedWorkOrders);
        }
    }, [ungroupedWorkOrders]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor)
    );

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        const activeId = String(active.id);

        // Mark that we're dragging (prevents prop sync during drag)
        isDraggingRef.current = true;

        // Find and store the source container
        const container = findContainer(activeId);
        sourceContainerRef.current = container;
        currentContainerRef.current = container;

        // Find the item being dragged
        for (const list of lists) {
            const item = list.workOrders.find((wo) => wo.id === activeId);
            if (item) {
                setActiveItem(item);
                return;
            }
        }

        const ungroupedItem = ungrouped.find((wo) => wo.id === activeId);
        if (ungroupedItem) {
            setActiveItem(ungroupedItem);
        }
    };

    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event;
        if (!over || !activeItem) {
            setOverContainerId(null);
            return;
        }

        const activeId = String(active.id);
        const overId = String(over.id);

        // Use the ref for current container (more reliable than findContainer during rapid updates)
        const activeContainer = currentContainerRef.current;

        // Find destination container
        let overContainer = findContainer(overId);

        // If over is a container directly (list id or 'ungrouped')
        if (overId === 'ungrouped' || lists.some((l) => l.id === overId)) {
            overContainer = overId;
        }

        // Update the visual highlight (for which container we're over)
        setOverContainerId(overContainer);

        if (!activeContainer || !overContainer || activeContainer === overContainer) {
            return;
        }

        // Update the current container ref BEFORE state updates
        currentContainerRef.current = overContainer;

        // Move item between containers (optimistic UI update)
        // Remove from source
        if (activeContainer === 'ungrouped') {
            setUngrouped((prev) => prev.filter((wo) => wo.id !== activeId));
        } else {
            setLists((prevLists) =>
                prevLists.map((l) =>
                    l.id === activeContainer
                        ? { ...l, workOrders: l.workOrders.filter((wo) => wo.id !== activeId) }
                        : l
                )
            );
        }

        // Add to destination (with duplicate prevention)
        if (overContainer === 'ungrouped') {
            setUngrouped((prev) => {
                // Prevent duplicates
                if (prev.some((wo) => wo.id === activeItem.id)) return prev;
                return [...prev, activeItem];
            });
        } else {
            setLists((prevLists) =>
                prevLists.map((l) => {
                    if (l.id !== overContainer) return l;
                    // Prevent duplicates
                    if (l.workOrders.some((wo) => wo.id === activeItem.id)) return l;
                    return { ...l, workOrders: [...l.workOrders, activeItem] };
                })
            );
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        const draggedItem = activeItem;
        const originalContainer = sourceContainerRef.current;
        const currentContainer = currentContainerRef.current;

        setActiveItem(null);
        setOverContainerId(null);
        sourceContainerRef.current = null;
        currentContainerRef.current = null;
        isDraggingRef.current = false;

        if (!over || !draggedItem) return;

        const activeId = String(active.id);
        const overId = String(over.id);

        let overContainer = findContainer(overId);

        // If dropping on a container directly
        if (overId === 'ungrouped' || lists.some((l) => l.id === overId)) {
            overContainer = overId;
        }

        if (!currentContainer || !overContainer) return;

        // Same container reorder
        if (currentContainer === overContainer) {
            if (currentContainer === 'ungrouped') {
                const oldIndex = ungrouped.findIndex((wo) => wo.id === activeId);
                const newIndex = ungrouped.findIndex((wo) => wo.id === overId);
                if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
                    const newOrder = arrayMove(ungrouped, oldIndex, newIndex);
                    setUngrouped(newOrder);
                    saveWorkOrdersOrder(null, newOrder.map((wo) => wo.id));
                }
            } else {
                const list = lists.find((l) => l.id === currentContainer);
                if (list) {
                    const oldIndex = list.workOrders.findIndex((wo) => wo.id === activeId);
                    const newIndex = list.workOrders.findIndex((wo) => wo.id === overId);
                    if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
                        const newOrder = arrayMove(list.workOrders, oldIndex, newIndex);
                        setLists((prev) =>
                            prev.map((l) =>
                                l.id === currentContainer
                                    ? { ...l, workOrders: newOrder }
                                    : l
                            )
                        );
                        saveWorkOrdersOrder(currentContainer, newOrder.map((wo) => wo.id));
                    }
                }
            }
        }

        // Cross-container move - persist to backend
        if (originalContainer && originalContainer !== currentContainer) {
            // Save the work order to the new list
            saveWorkOrderMove(activeId, currentContainer === 'ungrouped' ? null : currentContainer);
        }
    };

    const handleDragCancel = () => {
        setActiveItem(null);
        setOverContainerId(null);
        sourceContainerRef.current = null;
        currentContainerRef.current = null;
        isDraggingRef.current = false;

        // Resync from props since we cancelled
        setLists(workOrderLists);
        setUngrouped(ungroupedWorkOrders);
    };

    const saveWorkOrderMove = (workOrderId: string, newListId: string | null) => {
        if (newListId) {
            // Moving to a specific list
            router.post(
                `/work/work-order-lists/${newListId}/move-work-order`,
                { workOrderId },
                { preserveScroll: true }
            );
        } else {
            // Moving to ungrouped (remove from list)
            router.post(
                `/work/work-orders/${workOrderId}/remove-from-list`,
                {},
                { preserveScroll: true }
            );
        }
    };

    const findContainer = (id: string): string | null => {
        if (id === 'ungrouped') return 'ungrouped';

        // Check if it's a list id
        if (lists.some((l) => l.id === id)) return id;

        // Check if it's a work order in ungrouped
        if (ungrouped.some((wo) => wo.id === id)) return 'ungrouped';

        // Check if it's a work order in a list
        for (const list of lists) {
            if (list.workOrders.some((wo) => wo.id === id)) {
                return list.id;
            }
        }

        return null;
    };

    const saveWorkOrdersOrder = (listId: string | null, workOrderIds: string[]) => {
        router.post(
            `/work/projects/${projectId}/work-orders/reorder`,
            {
                listId,
                workOrderIds,
            },
            { preserveScroll: true }
        );
    };

    // Filter archived work orders
    const filterWOs = (wos: WorkOrderInList[]) =>
        showArchived ? wos : wos.filter((wo) => wo.status !== 'archived');

    const filteredLists = lists.map((l) => ({ ...l, workOrders: filterWOs(l.workOrders) }));
    const filteredUngrouped = filterWOs(ungrouped);

    const totalWorkOrders =
        filteredLists.reduce((acc, l) => acc + l.workOrders.length, 0) + filteredUngrouped.length;

    const hasDeliveredWOs =
        lists.some((l) => l.workOrders.some((wo) => wo.status === 'delivered')) ||
        ungrouped.some((wo) => wo.status === 'delivered');

    const hasArchivedWOs =
        lists.some((l) => l.workOrders.some((wo) => wo.status === 'archived')) ||
        ungrouped.some((wo) => wo.status === 'archived');

    return (
        <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <h2 className="text-lg font-bold text-foreground">
                        Work Orders ({totalWorkOrders})
                    </h2>
                    {hasArchivedWOs && (
                        <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                            <input
                                type="checkbox"
                                checked={showArchived}
                                onChange={(e) => setShowArchived(e.target.checked)}
                                className="rounded border-muted-foreground/50"
                            />
                            Show archived
                        </label>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {hasDeliveredWOs && onBulkArchiveDelivered && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onBulkArchiveDelivered}
                        >
                            <Archive className="h-4 w-4 mr-2" />
                            Archive delivered
                        </Button>
                    )}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCreateListDialogOpen(true)}
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Add List
                    </Button>
                    <Button size="sm" onClick={() => onCreateWorkOrder()}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Work Order
                    </Button>
                </div>
            </div>

            {totalWorkOrders === 0 && lists.length === 0 ? (
                <div className="text-center py-12 bg-muted/50 rounded-xl">
                    <p className="text-muted-foreground mb-4">
                        No work orders yet. Create one to get started.
                    </p>
                    <Button onClick={() => onCreateWorkOrder()}>Create Work Order</Button>
                </div>
            ) : (
                <DndContext
                    sensors={sensors}
                    collisionDetection={rectIntersection}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragEnd={handleDragEnd}
                    onDragCancel={handleDragCancel}
                >
                    <div className="space-y-4">
                        {filteredLists.map((list) => (
                            <WorkOrderListGroup
                                key={list.id}
                                list={list}
                                projectId={projectId}
                                onCreateWorkOrder={() => onCreateWorkOrder(list.id)}
                                isDropTarget={overContainerId === list.id}
                                parties={parties}
                                projectPartyId={projectPartyId}
                            />
                        ))}

                        {/* Ungrouped Work Orders */}
                        <WorkOrderListGroup
                            list={{
                                id: 'ungrouped',
                                name: 'Ungrouped',
                                description: null,
                                color: null,
                                position: 999999,
                                workOrders: filteredUngrouped,
                            }}
                            projectId={projectId}
                            onCreateWorkOrder={() => onCreateWorkOrder()}
                            isUngrouped
                            isDropTarget={overContainerId === 'ungrouped'}
                        />
                    </div>

                    <DragOverlay>
                        {activeItem ? (
                            <WorkOrderListItem
                                workOrder={activeItem}
                                isDragOverlay
                            />
                        ) : null}
                    </DragOverlay>
                </DndContext>
            )}

            <CreateListDialog
                open={createListDialogOpen}
                onOpenChange={setCreateListDialogOpen}
                projectId={projectId}
                projectName={projectName}
            />
        </div>
    );
}

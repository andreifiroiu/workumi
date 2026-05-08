import { useState } from 'react';
import { router } from '@inertiajs/react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import {
    ChevronDown,
    ChevronRight,
    MoreVertical,
    Plus,
    Edit,
    Trash2,
    FolderOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { WorkOrderListItem } from './work-order-list-item';
import { EditListDialog } from './edit-list-dialog';
import type { WorkOrderList } from '@/types/work';
import { cn } from '@/lib/utils';

interface WorkOrderListGroupProps {
    list: WorkOrderList;
    projectId: string;
    onCreateWorkOrder: () => void;
    isUngrouped?: boolean;
    isDropTarget?: boolean;
}

export function WorkOrderListGroup({
    list,
    projectId,
    onCreateWorkOrder,
    isUngrouped = false,
    isDropTarget = false,
}: WorkOrderListGroupProps) {
    const [isOpen, setIsOpen] = useState(true);
    const [editDialogOpen, setEditDialogOpen] = useState(false);

    const { setNodeRef, isOver } = useDroppable({
        id: list.id,
    });

    // Use either the prop-based highlight or the native useDroppable isOver
    const showDropHighlight = isDropTarget || isOver;

    const handleDelete = () => {
        if (
            confirm(
                `Are you sure you want to delete "${list.name}"? Work orders in this list will become ungrouped.`
            )
        ) {
            router.delete(`/work/work-order-lists/${list.id}`, {
                preserveScroll: true,
            });
        }
    };

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <div
                ref={setNodeRef}
                id={isUngrouped ? undefined : `list-${list.id}`}
                className={cn(
                    'border border-border rounded-lg overflow-hidden transition-colors scroll-mt-20',
                    showDropHighlight && 'border-primary bg-primary/5'
                )}
            >
                {/* Header */}
                <div
                    className={cn(
                        'flex items-center gap-2 px-4 py-3',
                        list.color ? '' : 'bg-muted/50'
                    )}
                    style={
                        list.color
                            ? { backgroundColor: `${list.color}15` }
                            : undefined
                    }
                >
                    <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                            {isOpen ? (
                                <ChevronDown className="h-4 w-4" />
                            ) : (
                                <ChevronRight className="h-4 w-4" />
                            )}
                        </Button>
                    </CollapsibleTrigger>

                    {list.color && (
                        <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: list.color }}
                        />
                    )}

                    {isUngrouped && (
                        <FolderOpen className="h-4 w-4 text-muted-foreground" />
                    )}

                    <span className="font-medium flex-1">{list.name}</span>
                    <span className="text-sm text-muted-foreground">
                        {list.workOrders.length} work order
                        {list.workOrders.length !== 1 ? 's' : ''}
                    </span>

                    {!isUngrouped && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit List
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={onCreateWorkOrder}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Work Order
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={handleDelete}
                                    className="text-destructive"
                                >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete List
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>

                {/* Content */}
                <CollapsibleContent>
                    <SortableContext
                        items={list.workOrders.map((wo) => wo.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        <div className="p-2 space-y-2">
                            {list.workOrders.length === 0 ? (
                                <div className="text-center py-6 text-muted-foreground text-sm">
                                    {isUngrouped
                                        ? 'No ungrouped work orders'
                                        : 'Drag work orders here or click to add'}
                                </div>
                            ) : (
                                list.workOrders.map((workOrder) => (
                                    <WorkOrderListItem
                                        key={workOrder.id}
                                        workOrder={workOrder}
                                        listId={isUngrouped ? null : list.id}
                                    />
                                ))
                            )}
                        </div>
                    </SortableContext>
                </CollapsibleContent>
            </div>

            {!isUngrouped && (
                <EditListDialog
                    open={editDialogOpen}
                    onOpenChange={setEditDialogOpen}
                    list={list}
                />
            )}
        </Collapsible>
    );
}

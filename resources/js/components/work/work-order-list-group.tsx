import { Button } from '@/components/ui/button';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { MoveDestinationProject, WorkOrderList } from '@/types/work';
import { useDroppable } from '@dnd-kit/core';
import {
    SortableContext,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { router } from '@inertiajs/react';
import {
    ChevronDown,
    ChevronRight,
    Edit,
    FolderOpen,
    FolderSymlink,
    MoreVertical,
    Plus,
    Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { ConvertListToProjectDialog } from './convert-list-to-project-dialog';
import { EditListDialog } from './edit-list-dialog';
import { WorkOrderListItem } from './work-order-list-item';

interface WorkOrderListGroupProps {
    list: WorkOrderList;
    projectId: string;
    onCreateWorkOrder: () => void;
    isUngrouped?: boolean;
    isDropTarget?: boolean;
    parties?: Array<{ id: string; name: string }>;
    projectPartyId?: string;
    moveDestinations?: MoveDestinationProject[];
}

export function WorkOrderListGroup({
    list,
    projectId,
    onCreateWorkOrder,
    isUngrouped = false,
    isDropTarget = false,
    parties = [],
    projectPartyId = '',
    moveDestinations = [],
}: WorkOrderListGroupProps) {
    const [isOpen, setIsOpen] = useState(true);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [convertDialogOpen, setConvertDialogOpen] = useState(false);

    const { setNodeRef, isOver } = useDroppable({
        id: list.id,
    });

    // Use either the prop-based highlight or the native useDroppable isOver
    const showDropHighlight = isDropTarget || isOver;

    const handleDelete = () => {
        if (
            confirm(
                `Are you sure you want to delete "${list.name}"? Work orders in this list will become ungrouped.`,
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
                    'scroll-mt-20 overflow-hidden rounded-lg border border-border transition-colors',
                    showDropHighlight && 'border-primary bg-primary/5',
                )}
            >
                {/* Header */}
                <div
                    className={cn(
                        'flex items-center gap-2 px-4 py-3',
                        list.color ? '' : 'bg-muted/50',
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
                            className="h-3 w-3 flex-shrink-0 rounded-full"
                            style={{ backgroundColor: list.color }}
                        />
                    )}

                    {isUngrouped && (
                        <FolderOpen className="h-4 w-4 text-muted-foreground" />
                    )}

                    <span className="flex-1 font-medium">{list.name}</span>
                    <span className="text-sm text-muted-foreground">
                        {list.workOrders.length} work order
                        {list.workOrders.length !== 1 ? 's' : ''}
                    </span>

                    {!isUngrouped && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                >
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                    onClick={() => setEditDialogOpen(true)}
                                >
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit List
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={onCreateWorkOrder}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add Work Order
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => setConvertDialogOpen(true)}
                                    disabled={list.workOrders.length === 0}
                                >
                                    <FolderSymlink className="mr-2 h-4 w-4" />
                                    Convert to Project
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={handleDelete}
                                    className="text-destructive"
                                >
                                    <Trash2 className="mr-2 h-4 w-4" />
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
                        <div className="space-y-2 p-2">
                            {list.workOrders.length === 0 ? (
                                <div className="py-6 text-center text-sm text-muted-foreground">
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
                                        projectId={projectId}
                                        moveDestinations={moveDestinations}
                                    />
                                ))
                            )}
                        </div>
                    </SortableContext>
                </CollapsibleContent>
            </div>

            {!isUngrouped && (
                <>
                    <EditListDialog
                        open={editDialogOpen}
                        onOpenChange={setEditDialogOpen}
                        list={list}
                    />
                    <ConvertListToProjectDialog
                        open={convertDialogOpen}
                        onOpenChange={setConvertDialogOpen}
                        list={list}
                        parties={parties}
                        defaultPartyId={projectPartyId}
                    />
                </>
            )}
        </Collapsible>
    );
}

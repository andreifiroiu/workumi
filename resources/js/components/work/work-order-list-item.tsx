import { useState } from 'react';
import { Link, router } from '@inertiajs/react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, MoreVertical, FolderMinus, Edit, Trash2, AlertTriangle, Archive, ArchiveRestore, PackageCheck, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { workOrderStatusLabels, type WorkOrderStatus } from '@/components/ui/status-badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import type { WorkOrderInList } from '@/types/work';
import { cn } from '@/lib/utils';

interface WorkOrderListItemProps {
    workOrder: WorkOrderInList;
    listId?: string | null;
    isDragOverlay?: boolean;
}

export function WorkOrderListItem({
    workOrder,
    listId,
    isDragOverlay = false,
}: WorkOrderListItemProps) {
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: workOrder.id,
        disabled: isDragOverlay,
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const completedStatuses = ['delivered', 'approved', 'archived'];
    const isArchived = workOrder.status === 'archived';

    // Statuses selectable from the "Change status" submenu. Mirrors the
    // values accepted by WorkOrderController@updateStatus (archived is set
    // via its own dedicated action, not this list).
    const selectableStatuses: WorkOrderStatus[] = [
        'draft',
        'active',
        'in_review',
        'approved',
        'delivered',
    ];
    const isOverdue =
        !!workOrder.dueDate &&
        new Date(workOrder.dueDate) < new Date() &&
        !completedStatuses.includes(workOrder.status);

    const handleArchive = () => {
        router.post(`/work/work-orders/${workOrder.id}/archive`, {}, {
            preserveScroll: true,
            onError: (errors) => setActionError(errors.tasks ?? 'Failed to archive work order.'),
        });
    };

    const handleStatusChange = (status: string) => {
        if (status === workOrder.status) {
            return;
        }
        router.patch(
            `/work/work-orders/${workOrder.id}/status`,
            { status },
            { preserveScroll: true }
        );
    };

    const handleDeliverAndArchive = () => {
        router.post(
            `/work/work-orders/${workOrder.id}/deliver-and-archive`,
            {},
            {
                preserveScroll: true,
                onError: (errors) => setActionError(errors.tasks ?? 'Failed to deliver and archive work order.'),
            }
        );
    };

    const handleUnarchive = () => {
        router.post(`/work/work-orders/${workOrder.id}/restore`, {}, { preserveScroll: true });
    };

    const handleRemoveFromList = () => {
        router.post(
            `/work/work-orders/${workOrder.id}/remove-from-list`,
            {},
            { preserveScroll: true }
        );
    };

    const handleDelete = () => {
        router.delete(`/work/work-orders/${workOrder.id}`, {
            preserveScroll: true,
        });
        setDeleteDialogOpen(false);
    };

    const getPriorityVariant = (priority: string) => {
        switch (priority) {
            case 'urgent':
                return 'destructive';
            case 'high':
                return 'default';
            default:
                return 'secondary';
        }
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                'flex items-center gap-2 p-3 bg-card border rounded-lg group',
                isArchived
                    ? 'opacity-50 bg-muted/50 border-border'
                    : isOverdue
                        ? 'border-red-300 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20'
                        : 'border-border',
                isDragging && 'opacity-50',
                isDragOverlay && 'shadow-lg'
            )}
        >
            {/* Drag Handle */}
            <button
                className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground"
                {...attributes}
                {...listeners}
            >
                <GripVertical className="h-4 w-4" />
            </button>

            {/* Work Order Info */}
            <Link
                href={`/work/work-orders/${workOrder.id}`}
                className="flex-1 min-w-0 hover:text-primary transition-colors"
            >
                <div className="flex items-center gap-2 mb-1">
                    {isOverdue && (
                        <AlertTriangle className="h-4 w-4 flex-shrink-0 text-red-500 dark:text-red-400" />
                    )}
                    <span className="font-medium truncate">{workOrder.title}</span>
                    <Badge variant="outline" className="flex-shrink-0">
                        {workOrder.status}
                    </Badge>
                    <Badge
                        variant={getPriorityVariant(workOrder.priority)}
                        className="flex-shrink-0"
                    >
                        {workOrder.priority}
                    </Badge>
                    {isOverdue && (
                        <Badge variant="destructive" className="flex-shrink-0">
                            Overdue
                        </Badge>
                    )}
                </div>
                <div className="text-sm text-muted-foreground truncate">
                    {workOrder.assignedToName} •{' '}
                    {workOrder.completedTasksCount}/{workOrder.tasksCount} tasks
                    {workOrder.dueDate && (
                        <>
                            {' • '}
                            <span className={isOverdue ? 'text-red-500 dark:text-red-400 font-medium' : ''}>
                                Due {new Date(workOrder.dueDate).toLocaleDateString()}
                            </span>
                        </>
                    )}
                </div>
            </Link>

            {/* Actions */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        <MoreVertical className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                        <Link href={`/work/work-orders/${workOrder.id}`}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Work Order
                        </Link>
                    </DropdownMenuItem>
                    {!isArchived && (
                        <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Change Status
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                                <DropdownMenuRadioGroup
                                    value={workOrder.status}
                                    onValueChange={handleStatusChange}
                                >
                                    {selectableStatuses.map((status) => (
                                        <DropdownMenuRadioItem key={status} value={status}>
                                            {workOrderStatusLabels[status]}
                                        </DropdownMenuRadioItem>
                                    ))}
                                </DropdownMenuRadioGroup>
                            </DropdownMenuSubContent>
                        </DropdownMenuSub>
                    )}
                    {!isArchived && (
                        <DropdownMenuItem onClick={handleDeliverAndArchive}>
                            <PackageCheck className="h-4 w-4 mr-2" />
                            Mark as Delivered & Archive
                        </DropdownMenuItem>
                    )}
                    {isArchived ? (
                        <DropdownMenuItem onClick={handleUnarchive}>
                            <ArchiveRestore className="h-4 w-4 mr-2" />
                            Unarchive
                        </DropdownMenuItem>
                    ) : (
                        <DropdownMenuItem onClick={handleArchive}>
                            <Archive className="h-4 w-4 mr-2" />
                            Archive
                        </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        onClick={() => setDeleteDialogOpen(true)}
                        className="text-destructive focus:text-destructive"
                    >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Work Order
                    </DropdownMenuItem>
                    {listId && (
                        <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleRemoveFromList}>
                                <FolderMinus className="h-4 w-4 mr-2" />
                                Remove from List
                            </DropdownMenuItem>
                        </>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Work Order</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete "{workOrder.title}"? This action cannot be undone. All associated tasks and deliverables will also be deleted.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                        >
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={actionError !== null} onOpenChange={(open) => !open && setActionError(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Cannot complete work order</DialogTitle>
                        <DialogDescription>{actionError}</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button onClick={() => setActionError(null)}>OK</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

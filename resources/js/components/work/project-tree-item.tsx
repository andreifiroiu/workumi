import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type {
    Project,
    Task,
    WorkOrder,
    WorkOrderInList,
    WorkOrderList,
} from '@/types/work';
import { Link, router } from '@inertiajs/react';
import {
    ChevronDown,
    ChevronRight,
    Edit,
    Folder,
    List,
    Lock,
    MoreVertical,
    Plus,
    Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { StatusBadge } from './status-badge';

interface ProjectTreeItemProps {
    project: Project;
    workOrders: WorkOrder[];
    tasks: Task[];
    onCreateWorkOrder: (projectId: string, listId?: string) => void;
    onCreateTask: (workOrderId: string) => void;
}

export function ProjectTreeItem({
    project,
    tasks,
    onCreateWorkOrder,
    onCreateTask,
}: ProjectTreeItemProps) {
    const [isExpanded, setIsExpanded] = useState(true);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    const totalWorkOrders =
        (project.workOrderLists?.reduce(
            (sum, list) => sum + list.workOrders.length,
            0,
        ) ?? 0) + (project.ungroupedWorkOrders?.length ?? 0);

    const hasLists =
        project.workOrderLists && project.workOrderLists.length > 0;
    const hasUngrouped =
        project.ungroupedWorkOrders && project.ungroupedWorkOrders.length > 0;

    return (
        <div className="border-l-2 border-muted">
            {/* Project Row */}
            <div className="group relative flex items-center gap-2 px-3 py-2 transition-colors hover:bg-muted/50">
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="flex h-5 w-5 flex-shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                >
                    {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                    ) : (
                        <ChevronRight className="h-4 w-4" />
                    )}
                </button>

                <Folder className="h-5 w-5 flex-shrink-0 text-primary" />

                <Link
                    href={`/work/projects/${project.id}`}
                    className="min-w-0 flex-1 text-left"
                >
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate font-semibold text-foreground">
                            {project.name}
                        </span>
                        {project.isPrivate && (
                            <Lock
                                className="h-3 w-3 text-muted-foreground"
                                title="Private project"
                            />
                        )}
                        <StatusBadge status={project.status} type="project" />
                        <span className="text-sm text-muted-foreground">
                            {project.partyName}
                        </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{totalWorkOrders} work orders</span>
                        {project.budgetHours && (
                            <span>
                                {project.actualHours}/{project.budgetHours}h
                            </span>
                        )}
                        <span>{project.progress}% complete</span>
                    </div>
                </Link>

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onCreateWorkOrder(project.id)}
                    className="h-7 w-7 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100"
                    title="Add work order"
                >
                    <Plus className="h-4 w-4" />
                </Button>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            title="More options"
                        >
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                            <Link href={`/work/projects/${project.id}`}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Project
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={() => setDeleteDialogOpen(true)}
                            className="text-destructive focus:text-destructive"
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Project
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                <Dialog
                    open={deleteDialogOpen}
                    onOpenChange={setDeleteDialogOpen}
                >
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Delete Project</DialogTitle>
                            <DialogDescription>
                                Are you sure you want to delete "{project.name}
                                "? This action cannot be undone.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => setDeleteDialogOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={() => {
                                    router.delete(
                                        `/work/projects/${project.id}`,
                                        { preserveScroll: true },
                                    );
                                    setDeleteDialogOpen(false);
                                }}
                            >
                                Delete
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Work Order Lists and Ungrouped Work Orders */}
            {isExpanded && (hasLists || hasUngrouped) && (
                <div className="ml-7">
                    {/* Work Order Lists */}
                    {project.workOrderLists?.map((list) => (
                        <WorkOrderListTreeItem
                            key={list.id}
                            list={list}
                            projectId={project.id}
                            tasks={tasks}
                            onCreateWorkOrder={onCreateWorkOrder}
                            onCreateTask={onCreateTask}
                        />
                    ))}

                    {/* Ungrouped Work Orders */}
                    {hasUngrouped && (
                        <UngroupedWorkOrdersTreeItem
                            workOrders={project.ungroupedWorkOrders}
                            tasks={tasks}
                            onCreateTask={onCreateTask}
                        />
                    )}
                </div>
            )}
        </div>
    );
}

interface WorkOrderListTreeItemProps {
    list: WorkOrderList;
    projectId: string;
    tasks: Task[];
    onCreateWorkOrder: (projectId: string, listId?: string) => void;
    onCreateTask: (workOrderId: string) => void;
}

function WorkOrderListTreeItem({
    list,
    projectId,
    tasks,
    onCreateWorkOrder,
    onCreateTask,
}: WorkOrderListTreeItemProps) {
    const [isExpanded, setIsExpanded] = useState(true);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    return (
        <div className="border-l-2 border-muted">
            {/* List Row */}
            <div className="group relative flex items-center gap-2 px-3 py-2 transition-colors hover:bg-muted/50">
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="flex h-5 w-5 flex-shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                >
                    {list.workOrders.length > 0 ? (
                        isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                        ) : (
                            <ChevronRight className="h-4 w-4" />
                        )
                    ) : (
                        <div className="h-1 w-1 rounded-full bg-muted-foreground" />
                    )}
                </button>

                <div className="flex min-w-0 flex-1 items-center gap-2">
                    {list.color && (
                        <div
                            className="h-3 w-3 flex-shrink-0 rounded-sm"
                            style={{ backgroundColor: list.color }}
                        />
                    )}
                    {!list.color && (
                        <List className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    )}
                    <span className="truncate font-medium text-foreground">
                        {list.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                        {list.workOrders.length} work orders
                    </span>
                </div>

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onCreateWorkOrder(projectId, list.id)}
                    className="h-7 w-7 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100"
                    title="Add work order"
                >
                    <Plus className="h-4 w-4" />
                </Button>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            title="More options"
                        >
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                            <Link href={`/work/work-order-lists/${list.id}`}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit List
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={() => setDeleteDialogOpen(true)}
                            className="text-destructive focus:text-destructive"
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete List
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                <Dialog
                    open={deleteDialogOpen}
                    onOpenChange={setDeleteDialogOpen}
                >
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Delete List</DialogTitle>
                            <DialogDescription>
                                Are you sure you want to delete "{list.name}"?
                                Work orders in this list will become ungrouped.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => setDeleteDialogOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={() => {
                                    router.delete(
                                        `/work/work-order-lists/${list.id}`,
                                        { preserveScroll: true },
                                    );
                                    setDeleteDialogOpen(false);
                                }}
                            >
                                Delete
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Work Orders in List */}
            {isExpanded && list.workOrders.length > 0 && (
                <div className="ml-7">
                    {list.workOrders.map((workOrder) => (
                        <WorkOrderInListTreeItem
                            key={workOrder.id}
                            workOrder={workOrder}
                            tasks={tasks.filter(
                                (t) => t.workOrderId === workOrder.id,
                            )}
                            onCreateTask={onCreateTask}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

interface UngroupedWorkOrdersTreeItemProps {
    workOrders: WorkOrderInList[];
    tasks: Task[];
    onCreateTask: (workOrderId: string) => void;
}

function UngroupedWorkOrdersTreeItem({
    workOrders,
    tasks,
    onCreateTask,
}: UngroupedWorkOrdersTreeItemProps) {
    const [isExpanded, setIsExpanded] = useState(true);

    return (
        <div className="border-l-2 border-muted">
            {/* Ungrouped Header Row */}
            <div className="group relative flex items-center gap-2 px-3 py-2 transition-colors hover:bg-muted/50">
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="flex h-5 w-5 flex-shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                >
                    {workOrders.length > 0 ? (
                        isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                        ) : (
                            <ChevronRight className="h-4 w-4" />
                        )
                    ) : (
                        <div className="h-1 w-1 rounded-full bg-muted-foreground" />
                    )}
                </button>

                <div className="flex min-w-0 flex-1 items-center gap-2">
                    <List className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    <span className="truncate font-medium text-muted-foreground">
                        Ungrouped
                    </span>
                    <span className="text-xs text-muted-foreground">
                        {workOrders.length} work orders
                    </span>
                </div>
            </div>

            {/* Ungrouped Work Orders */}
            {isExpanded && workOrders.length > 0 && (
                <div className="ml-7">
                    {workOrders.map((workOrder) => (
                        <WorkOrderInListTreeItem
                            key={workOrder.id}
                            workOrder={workOrder}
                            tasks={tasks.filter(
                                (t) => t.workOrderId === workOrder.id,
                            )}
                            onCreateTask={onCreateTask}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

interface WorkOrderInListTreeItemProps {
    workOrder: WorkOrderInList;
    tasks: Task[];
    onCreateTask: (workOrderId: string) => void;
}

function WorkOrderInListTreeItem({
    workOrder,
    tasks,
    onCreateTask,
}: WorkOrderInListTreeItemProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    const priorityColors: Record<string, string> = {
        low: 'text-muted-foreground',
        medium: 'text-amber-600 dark:text-amber-500',
        high: 'text-orange-600 dark:text-orange-500',
        urgent: 'text-red-600 dark:text-red-500',
    };

    return (
        <div className="border-l-2 border-muted">
            {/* Work Order Row */}
            <div className="group relative flex items-center gap-2 px-3 py-2 transition-colors hover:bg-muted/50">
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="flex h-5 w-5 flex-shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                >
                    {workOrder.tasksCount > 0 ? (
                        isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                        ) : (
                            <ChevronRight className="h-4 w-4" />
                        )
                    ) : (
                        <div className="h-1 w-1 rounded-full bg-muted-foreground" />
                    )}
                </button>

                <Link
                    href={`/work/work-orders/${workOrder.id}`}
                    className="min-w-0 flex-1 text-left"
                >
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate font-medium text-foreground">
                            {workOrder.title}
                        </span>
                        <StatusBadge
                            status={workOrder.status}
                            type="workOrder"
                        />
                        <span
                            className={`text-xs font-medium ${priorityColors[workOrder.priority]}`}
                        >
                            {workOrder.priority}
                        </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{workOrder.assignedToName}</span>
                        <span>
                            {workOrder.completedTasksCount}/
                            {workOrder.tasksCount} tasks
                        </span>
                        {workOrder.dueDate && (
                            <span
                                className={
                                    new Date(workOrder.dueDate) < new Date() &&
                                    !['done', 'archived', 'cancelled'].includes(
                                        workOrder.status,
                                    )
                                        ? 'font-medium text-destructive'
                                        : ''
                                }
                            >
                                Due{' '}
                                {new Date(
                                    workOrder.dueDate,
                                ).toLocaleDateString()}
                            </span>
                        )}
                    </div>
                </Link>

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onCreateTask(workOrder.id)}
                    className="h-7 w-7 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100"
                    title="Add task"
                >
                    <Plus className="h-4 w-4" />
                </Button>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            title="More options"
                        >
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                            <Link href={`/work/work-orders/${workOrder.id}`}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Work Order
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={() => setDeleteDialogOpen(true)}
                            className="text-destructive focus:text-destructive"
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Work Order
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                <Dialog
                    open={deleteDialogOpen}
                    onOpenChange={setDeleteDialogOpen}
                >
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Delete Work Order</DialogTitle>
                            <DialogDescription>
                                Are you sure you want to delete "
                                {workOrder.title}"? This action cannot be
                                undone. All associated tasks and deliverables
                                will also be deleted.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => setDeleteDialogOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={() => {
                                    router.delete(
                                        `/work/work-orders/${workOrder.id}`,
                                        { preserveScroll: true },
                                    );
                                    setDeleteDialogOpen(false);
                                }}
                            >
                                Delete
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Tasks */}
            {isExpanded && tasks.length > 0 && (
                <div className="ml-7">
                    {tasks.map((task) => (
                        <TaskTreeItem key={task.id} task={task} />
                    ))}
                </div>
            )}
        </div>
    );
}

interface TaskTreeItemProps {
    task: Task;
}

function TaskTreeItem({ task }: TaskTreeItemProps) {
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const completedItems = task.checklistItems.filter(
        (item) => item.completed,
    ).length;
    const totalItems = task.checklistItems.length;

    return (
        <div className="group relative flex items-center gap-2 px-3 py-2 transition-colors hover:bg-muted/50">
            <div className="h-5 w-5 flex-shrink-0" />

            <Link
                href={`/work/tasks/${task.id}`}
                className="min-w-0 flex-1 text-left"
            >
                <div className="flex flex-wrap items-center gap-2">
                    <span
                        className={`text-sm ${
                            task.isBlocked
                                ? 'text-muted-foreground line-through'
                                : 'text-foreground'
                        }`}
                    >
                        {task.title}
                    </span>
                    <StatusBadge status={task.status} type="task" />
                    {task.isBlocked && (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950/30 dark:text-red-400">
                            blocked
                        </span>
                    )}
                </div>
                <div className="mt-0.5 flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{task.assignedToName}</span>
                    {totalItems > 0 && (
                        <span>
                            {completedItems}/{totalItems} checklist items
                        </span>
                    )}
                    <span>
                        {task.actualHours}/{task.estimatedHours}h
                    </span>
                </div>
            </Link>

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        title="More options"
                    >
                        <MoreVertical className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                        <Link href={`/work/tasks/${task.id}`}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Task
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        onClick={() => setDeleteDialogOpen(true)}
                        className="text-destructive focus:text-destructive"
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Task
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Task</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete "{task.title}"? This
                            action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setDeleteDialogOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => {
                                router.delete(`/work/tasks/${task.id}`, {
                                    preserveScroll: true,
                                });
                                setDeleteDialogOpen(false);
                            }}
                        >
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

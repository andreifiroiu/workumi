import { useState } from 'react';
import { ChevronRight, ChevronDown, Folder, List, MoreVertical, Plus, Lock, Edit, Trash2 } from 'lucide-react';
import { Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { StatusBadge } from './status-badge';
import type { Project, WorkOrder, Task, WorkOrderList, WorkOrderInList } from '@/types/work';

interface ProjectTreeItemProps {
    project: Project;
    workOrders: WorkOrder[];
    tasks: Task[];
    onCreateWorkOrder: (projectId: string, listId?: string) => void;
    onCreateTask: (workOrderId: string) => void;
}

export function ProjectTreeItem({
    project,
    workOrders,
    tasks,
    onCreateWorkOrder,
    onCreateTask,
}: ProjectTreeItemProps) {
    const [isExpanded, setIsExpanded] = useState(true);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    const totalWorkOrders =
        (project.workOrderLists?.reduce((sum, list) => sum + list.workOrders.length, 0) ?? 0) +
        (project.ungroupedWorkOrders?.length ?? 0);

    const hasLists = project.workOrderLists && project.workOrderLists.length > 0;
    const hasUngrouped = project.ungroupedWorkOrders && project.ungroupedWorkOrders.length > 0;

    return (
        <div className="border-l-2 border-muted">
            {/* Project Row */}
            <div className="group relative flex items-center gap-2 py-2 px-3 hover:bg-muted/50 transition-colors">
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                >
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>

                <Folder className="flex-shrink-0 w-5 h-5 text-primary" />

                <Link href={`/work/projects/${project.id}`} className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-foreground truncate">
                            {project.name}
                        </span>
                        {project.isPrivate && (
                            <Lock className="h-3 w-3 text-muted-foreground" title="Private project" />
                        )}
                        <StatusBadge status={project.status} type="project" />
                        <span className="text-sm text-muted-foreground">
                            {project.partyName}
                        </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-0.5">
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
                    className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7"
                    title="Add work order"
                >
                    <Plus className="h-4 w-4" />
                </Button>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="More options">
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                            <Link href={`/work/projects/${project.id}`}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Project
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={() => setDeleteDialogOpen(true)}
                            className="text-destructive focus:text-destructive"
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Project
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Delete Project</DialogTitle>
                            <DialogDescription>
                                Are you sure you want to delete "{project.name}"? This action cannot be undone.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={() => {
                                    router.delete(`/work/projects/${project.id}`, { preserveScroll: true });
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

function WorkOrderListTreeItem({ list, projectId, tasks, onCreateWorkOrder, onCreateTask }: WorkOrderListTreeItemProps) {
    const [isExpanded, setIsExpanded] = useState(true);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    return (
        <div className="border-l-2 border-muted">
            {/* List Row */}
            <div className="group relative flex items-center gap-2 py-2 px-3 hover:bg-muted/50 transition-colors">
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                >
                    {list.workOrders.length > 0 ? (
                        isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                        ) : (
                            <ChevronRight className="h-4 w-4" />
                        )
                    ) : (
                        <div className="w-1 h-1 bg-muted-foreground rounded-full" />
                    )}
                </button>

                <div className="flex items-center gap-2 flex-1 min-w-0">
                    {list.color && (
                        <div
                            className="w-3 h-3 rounded-sm flex-shrink-0"
                            style={{ backgroundColor: list.color }}
                        />
                    )}
                    {!list.color && <List className="flex-shrink-0 w-4 h-4 text-muted-foreground" />}
                    <span className="font-medium text-foreground truncate">
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
                    className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7"
                    title="Add work order"
                >
                    <Plus className="h-4 w-4" />
                </Button>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="More options">
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                            <Link href={`/work/work-order-lists/${list.id}`}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit List
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={() => setDeleteDialogOpen(true)}
                            className="text-destructive focus:text-destructive"
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete List
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Delete List</DialogTitle>
                            <DialogDescription>
                                Are you sure you want to delete "{list.name}"? Work orders in this list will become ungrouped.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={() => {
                                    router.delete(`/work/work-order-lists/${list.id}`, { preserveScroll: true });
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
                            tasks={tasks.filter((t) => t.workOrderId === workOrder.id)}
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

function UngroupedWorkOrdersTreeItem({ workOrders, tasks, onCreateTask }: UngroupedWorkOrdersTreeItemProps) {
    const [isExpanded, setIsExpanded] = useState(true);

    return (
        <div className="border-l-2 border-muted">
            {/* Ungrouped Header Row */}
            <div className="group relative flex items-center gap-2 py-2 px-3 hover:bg-muted/50 transition-colors">
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                >
                    {workOrders.length > 0 ? (
                        isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                        ) : (
                            <ChevronRight className="h-4 w-4" />
                        )
                    ) : (
                        <div className="w-1 h-1 bg-muted-foreground rounded-full" />
                    )}
                </button>

                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <List className="flex-shrink-0 w-4 h-4 text-muted-foreground" />
                    <span className="font-medium text-muted-foreground truncate">
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
                            tasks={tasks.filter((t) => t.workOrderId === workOrder.id)}
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

function WorkOrderInListTreeItem({ workOrder, tasks, onCreateTask }: WorkOrderInListTreeItemProps) {
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
            <div className="group relative flex items-center gap-2 py-2 px-3 hover:bg-muted/50 transition-colors">
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                >
                    {workOrder.tasksCount > 0 ? (
                        isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                        ) : (
                            <ChevronRight className="h-4 w-4" />
                        )
                    ) : (
                        <div className="w-1 h-1 bg-muted-foreground rounded-full" />
                    )}
                </button>

                <Link href={`/work/work-orders/${workOrder.id}`} className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-foreground truncate">
                            {workOrder.title}
                        </span>
                        <StatusBadge status={workOrder.status} type="workOrder" />
                        <span className={`text-xs font-medium ${priorityColors[workOrder.priority]}`}>
                            {workOrder.priority}
                        </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-0.5">
                        <span>{workOrder.assignedToName}</span>
                        <span>
                            {workOrder.completedTasksCount}/{workOrder.tasksCount} tasks
                        </span>
                        {workOrder.dueDate && (
                            <span className={
                                new Date(workOrder.dueDate) < new Date() && !['done', 'archived', 'cancelled'].includes(workOrder.status)
                                    ? 'text-destructive font-medium'
                                    : ''
                            }>
                                Due {new Date(workOrder.dueDate).toLocaleDateString()}
                            </span>
                        )}
                    </div>
                </Link>

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onCreateTask(workOrder.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7"
                    title="Add task"
                >
                    <Plus className="h-4 w-4" />
                </Button>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="More options">
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
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={() => setDeleteDialogOpen(true)}
                            className="text-destructive focus:text-destructive"
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Work Order
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

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
                                onClick={() => {
                                    router.delete(`/work/work-orders/${workOrder.id}`, { preserveScroll: true });
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

interface WorkOrderTreeItemProps {
    workOrder: WorkOrder;
    tasks: Task[];
    onCreateTask: (workOrderId: string) => void;
}

function WorkOrderTreeItem({ workOrder, tasks, onCreateTask }: WorkOrderTreeItemProps) {
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
            <div className="group relative flex items-center gap-2 py-2 px-3 hover:bg-muted/50 transition-colors">
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                >
                    {tasks.length > 0 ? (
                        isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                        ) : (
                            <ChevronRight className="h-4 w-4" />
                        )
                    ) : (
                        <div className="w-1 h-1 bg-muted-foreground rounded-full" />
                    )}
                </button>

                <Link href={`/work/work-orders/${workOrder.id}`} className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-foreground truncate">
                            {workOrder.title}
                        </span>
                        <StatusBadge status={workOrder.status} type="workOrder" />
                        <span className={`text-xs font-medium ${priorityColors[workOrder.priority]}`}>
                            {workOrder.priority}
                        </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-0.5">
                        <span>{workOrder.assignedToName}</span>
                        <span>{tasks.length} tasks</span>
                        <span>
                            {workOrder.actualHours}/{workOrder.estimatedHours}h
                        </span>
                    </div>
                </Link>

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onCreateTask(workOrder.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7"
                    title="Add task"
                >
                    <Plus className="h-4 w-4" />
                </Button>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="More options">
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
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={() => setDeleteDialogOpen(true)}
                            className="text-destructive focus:text-destructive"
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Work Order
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

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
                                onClick={() => {
                                    router.delete(`/work/work-orders/${workOrder.id}`, { preserveScroll: true });
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
    const completedItems = task.checklistItems.filter((item) => item.completed).length;
    const totalItems = task.checklistItems.length;

    return (
        <div className="group relative flex items-center gap-2 py-2 px-3 hover:bg-muted/50 transition-colors">
            <div className="flex-shrink-0 w-5 h-5" />

            <Link href={`/work/tasks/${task.id}`} className="flex-1 min-w-0 text-left">
                <div className="flex items-center gap-2 flex-wrap">
                    <span
                        className={`text-sm ${
                            task.isBlocked
                                ? 'line-through text-muted-foreground'
                                : 'text-foreground'
                        }`}
                    >
                        {task.title}
                    </span>
                    <StatusBadge status={task.status} type="task" />
                    {task.isBlocked && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400">
                            blocked
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground mt-0.5">
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
                    <Button variant="ghost" size="icon" className="h-7 w-7" title="More options">
                        <MoreVertical className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                        <Link href={`/work/tasks/${task.id}`}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Task
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        onClick={() => setDeleteDialogOpen(true)}
                        className="text-destructive focus:text-destructive"
                    >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Task
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Task</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete "{task.title}"? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => {
                                router.delete(`/work/tasks/${task.id}`, { preserveScroll: true });
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

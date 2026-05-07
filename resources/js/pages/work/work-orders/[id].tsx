import { Head, Link, useForm, router } from '@inertiajs/react';
import {
    DndContext,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from '@dnd-kit/core';
import {
    SortableContext,
    verticalListSortingStrategy,
    useSortable,
    arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
    ArrowLeft,
    Calendar,
    Clock,
    User,
    Plus,
    MoreVertical,
    MessageSquare,
    FileText,
    Edit,
    Trash2,
    CheckCircle2,
    ExternalLink,
    X,
    History,
    AlertTriangle,
    Users,
    RefreshCw,
    ArrowUpCircle,
    GripVertical,
    List,
    LayoutGrid,
    Archive,
    ArchiveRestore,
} from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import InputError from '@/components/input-error';
import { BudgetFieldsGroup } from '@/components/budget';
import type { BudgetType } from '@/types/work';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatusBadge, PriorityBadge, ProgressBar } from '@/components/work';
import { TaskKanbanBoard } from '@/components/work/task-kanban';
import { PromoteToWorkOrderDialog } from '@/components/work/promote-to-work-order-dialog';
import { HoursProgressIndicator } from '@/components/time-tracking';
import { CommunicationsPanel } from '@/components/communications';
import {
    TransitionButton,
    TransitionDialog,
    TransitionHistory,
    RaciSelector,
    AssignmentConfirmationDialog,
    type TransitionOption,
    type StatusTransition,
    type RaciValue,
    type RaciUser,
    type RaciRole,
    type AssignmentChange,
} from '@/components/workflow';
import { workOrderStatusLabels } from '@/components/ui/status-badge';
import {
    PMCopilotTriggerButton,
    PlanAlternativesPanel,
    PMCopilotSettingsToggle,
    PlanExecutionPanel,
} from '@/components/pm-copilot';
import { DraftClientUpdateButton } from '@/components/client-comms';
import { ProjectDocumentsSection } from '@/pages/work/projects/components/project-documents-section';
import {
    useTriggerPMCopilot,
    usePMCopilotSuggestions,
    useApproveSuggestion,
    useRejectSuggestion,
    useDelegatePlan,
    useConfirmAssignments,
} from '@/hooks/use-pm-copilot';
import type { PlanAlternative, PMCopilotMode } from '@/types/pm-copilot.d';
import { useState, useEffect, useCallback, useMemo } from 'react';
import type { BreadcrumbItem } from '@/types';
import { getCsrfToken } from '@/lib/csrf';

/**
 * Team member type
 */
interface TeamMember {
    id: string;
    name: string;
}

/**
 * Rejection feedback from a previous revision request
 */
interface RejectionFeedback {
    comment: string;
    user: { id: number; name: string; email: string };
    createdAt: string;
}

/**
 * Extended Work Order type with RACI properties
 */
interface WorkOrderWithRaci {
    id: string;
    title: string;
    description: string | null;
    projectId: string;
    projectName: string;
    assignedToId: string | null;
    assignedToName: string;
    status: string;
    priority: string;
    dueDate: string | null;
    estimatedHours: number;
    actualHours: number;
    acceptanceCriteria: string[];
    sopAttached: boolean;
    sopName: string | null;
    partyContactId: string | null;
    createdBy: string;
    createdByName: string;
    accountableId?: number | null;
    accountableName?: string | null;
    responsibleId?: number | null;
    responsibleName?: string | null;
    reviewerId?: number | null;
    reviewerName?: string | null;
    consultedIds?: number[] | null;
    informedIds?: number[] | null;
    budgetType?: BudgetType | null;
    budgetCost?: number | null;
    budgetHours?: number | null;
    averageBillingRate?: number;
    pmCopilotMode?: PMCopilotMode;
    pmCopilotSuggestions?: {
        workOrderId: string;
        workflowState: { status: string; currentStep: string | null; progress: number; error: string | null };
        alternatives: PlanAlternative[];
        approvedAlternativeId?: string | null;
        rejectedAlternativeIds?: string[];
        insights: Array<unknown>;
        createdAt: string;
        updatedAt: string;
    };
}

/**
 * Extended props with workflow features
 */
interface WorkOrderDetailProps {
    workOrder: WorkOrderWithRaci;
    tasks: Array<{
        id: string;
        title: string;
        description: string | null;
        status: string;
        dueDate: string | null;
        assignedToId: string | null;
        assignedToName: string;
        assignedAgentId: string | null;
        assignedAgentName: string | null;
        estimatedHours: number;
        actualHours: number;
        checklistItems: Array<{ id: string; text: string; completed: boolean }>;
        isBlocked: boolean;
        positionInWorkOrder: number;
    }>;
    deliverables: Array<{
        id: string;
        title: string;
        description: string | null;
        type: string;
        status: string;
        version: string;
        createdDate: string;
        deliveredDate: string | null;
        fileUrl: string | null;
        acceptanceCriteria: string[];
    }>;
    documents: Array<{
        id: string;
        name: string;
        type: 'reference' | 'artifact' | 'evidence' | 'template';
        fileUrl: string;
        fileSize: string | null;
        mimeType?: string;
        folderId?: string | null;
        uploadedDate?: string;
    }>;
    folders: Array<{
        id: string;
        name: string;
        parentId: string | null;
        documentCount: number;
        children: Array<{
            id: string;
            name: string;
            parentId: string;
            documentCount: number;
            children: never[];
        }>;
    }>;
    communicationThread: {
        id: string;
        messageCount: number;
    } | null;
    messages: Array<{
        id: string;
        authorId: string;
        authorName: string;
        authorType: string;
        timestamp: string;
        content: string;
        type: string;
    }>;
    teamMembers: TeamMember[];
    availableAgents?: Array<{ id: string; name: string; type: string }>;
    statusTransitions?: StatusTransition[];
    allowedTransitions?: TransitionOption[];
    raciValue?: RaciValue;
    rejectionFeedback?: RejectionFeedback | null;
    siblingProjects?: Array<{ id: string; name: string }>;
    siblingWorkOrders?: Array<{ id: string; title: string }>;
}

/**
 * Sortable task card component for drag-and-drop reordering
 */
interface SortableTaskCardProps {
    task: WorkOrderDetailProps['tasks'][0];
    completingTaskId: string | null;
    onQuickComplete: (taskId: string, currentStatus: string, e: React.MouseEvent) => void;
    onStatusChange: (task: WorkOrderDetailProps['tasks'][0]) => void;
    onPromote: (task: WorkOrderDetailProps['tasks'][0]) => void;
    onDelete: (task: WorkOrderDetailProps['tasks'][0]) => void;
    onArchive: (task: WorkOrderDetailProps['tasks'][0]) => void;
    getStatusOptions: (currentStatus: string) => Array<{ value: string; label: string }>;
}

function SortableTaskCard({
    task,
    completingTaskId,
    onQuickComplete,
    onStatusChange,
    onPromote,
    onDelete,
    onArchive,
    getStatusOptions,
}: SortableTaskCardProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`rounded-lg border p-4 transition-colors ${
                task.status === 'archived'
                    ? 'bg-muted/50 border-border opacity-50'
                    : 'bg-card border-border hover:border-primary/50'
            }`}
        >
            <div className="flex items-start gap-3">
                <div
                    {...attributes}
                    {...listeners}
                    className="mt-1 cursor-grab text-muted-foreground hover:text-foreground"
                >
                    <GripVertical className="h-5 w-5" />
                </div>
                <button
                    type="button"
                    onClick={(e) => onQuickComplete(task.id, task.status, e)}
                    disabled={
                        task.status === 'done' ||
                        task.status === 'cancelled' ||
                        task.status === 'in_review' ||
                        task.status === 'blocked' ||
                        task.status === 'archived' ||
                        completingTaskId === task.id
                    }
                    className={`mt-1 flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors ${
                        task.status === 'done'
                            ? 'bg-primary border-primary'
                            : task.status === 'cancelled' || task.status === 'in_review' || task.status === 'blocked'
                              ? 'border-muted bg-muted cursor-not-allowed'
                              : completingTaskId === task.id
                                ? 'border-primary animate-pulse'
                                : 'border-muted-foreground hover:border-primary hover:bg-primary/10 cursor-pointer'
                    }`}
                    aria-label={
                        task.status === 'done'
                            ? 'Task completed'
                            : task.status === 'in_review'
                              ? 'Task is awaiting review'
                              : task.status === 'blocked'
                                ? 'Task is blocked'
                                : 'Mark task as done'
                    }
                >
                    {task.status === 'done' && <CheckCircle2 className="text-primary-foreground h-3 w-3" />}
                </button>
                <Link href={`/work/tasks/${task.id}`} className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span
                            className={`font-medium ${
                                task.status === 'done' ? 'text-muted-foreground line-through' : ''
                            }`}
                        >
                            {task.title}
                        </span>
                        <StatusBadge status={task.status} type="task" />
                        {task.isBlocked && <Badge variant="destructive">Blocked</Badge>}
                    </div>
                    <div className="text-muted-foreground text-sm">
                        {task.assignedAgentName ? `${task.assignedAgentName} (AI)` : task.assignedToName} - {task.checklistItems.filter((i) => i.completed).length}/
                        {task.checklistItems.length} items - {task.actualHours}/{task.estimatedHours}h
                        {task.dueDate && (
                            <span className={
                                new Date(task.dueDate) < new Date() && task.status !== 'done'
                                    ? 'text-destructive font-medium'
                                    : ''
                            }>
                                {` - Due ${new Date(task.dueDate).toLocaleDateString()}`}
                            </span>
                        )}
                    </div>
                </Link>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        {getStatusOptions(task.status).length > 0 && (
                            <>
                                <DropdownMenuItem
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onStatusChange(task);
                                    }}
                                >
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    Change Status
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                            </>
                        )}
                        <DropdownMenuItem
                            onClick={(e) => {
                                e.stopPropagation();
                                onPromote(task);
                            }}
                        >
                            <ArrowUpCircle className="mr-2 h-4 w-4" />
                            Promote to Work Order
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={(e) => {
                                e.stopPropagation();
                                onArchive(task);
                            }}
                        >
                            {task.status === 'archived' ? (
                                <>
                                    <ArchiveRestore className="mr-2 h-4 w-4" />
                                    Unarchive
                                </>
                            ) : (
                                <>
                                    <Archive className="mr-2 h-4 w-4" />
                                    Archive
                                </>
                            )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete(task);
                            }}
                            className="text-destructive"
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}

/** Format a Date as YYYY-MM-DD using local timezone. */
const formatLocalDate = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

/**
 * Calculate smart default due date based on work order due date.
 * If work order due date is within 1 week and in the future, use it.
 * Otherwise, default to 7 days from now.
 */
const calculateDefaultDueDate = (workOrderDueDate: string | null): string => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const oneWeekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    if (workOrderDueDate) {
        const woDueDate = new Date(workOrderDueDate);
        // If work order due date is within 1 week and in the future, use it
        if (woDueDate <= oneWeekFromNow && woDueDate >= today) {
            return workOrderDueDate;
        }
    }

    // Default to 7 days from now
    return formatLocalDate(oneWeekFromNow);
};

/**
 * Get a preset date value for quick-select buttons.
 */
const getPresetDate = (preset: 'today' | 'tomorrow' | 'nextMonday' | 'nextMonth'): string => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    switch (preset) {
        case 'today':
            return formatLocalDate(today);
        case 'tomorrow': {
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            return formatLocalDate(tomorrow);
        }
        case 'nextMonday': {
            const nextMonday = new Date(today);
            const daysUntilMonday = (8 - today.getDay()) % 7 || 7;
            nextMonday.setDate(nextMonday.getDate() + daysUntilMonday);
            return formatLocalDate(nextMonday);
        }
        case 'nextMonth': {
            const nextMonth = new Date(today);
            nextMonth.setMonth(nextMonth.getMonth() + 1);
            return formatLocalDate(nextMonth);
        }
    }
};

export default function WorkOrderDetail({
    workOrder,
    tasks,
    deliverables,
    documents,
    folders = [],
    communicationThread,
    messages,
    teamMembers,
    availableAgents = [],
    statusTransitions = [],
    allowedTransitions = [],
    raciValue,
    rejectionFeedback = null,
    siblingProjects = [],
    siblingWorkOrders = [],
}: WorkOrderDetailProps) {
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [createTaskDialogOpen, setCreateTaskDialogOpen] = useState(false);
    const [createDeliverableDialogOpen, setCreateDeliverableDialogOpen] = useState(false);
    const [editDeliverableDialogOpen, setEditDeliverableDialogOpen] = useState(false);
    const [deleteDeliverableDialogOpen, setDeleteDeliverableDialogOpen] = useState(false);
    const [selectedDeliverable, setSelectedDeliverable] = useState<typeof deliverables[0] | null>(null);
    const [newCriterion, setNewCriterion] = useState('');
    const [editCriterion, setEditCriterion] = useState('');
    const [commsPanelOpen, setCommsPanelOpen] = useState(false);

    // Workflow state
    const [transitionDialogOpen, setTransitionDialogOpen] = useState(false);
    const [selectedTransition, setSelectedTransition] = useState<string | null>(null);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [transitionError, setTransitionError] = useState<string | null>(null);
    const [localStatus, setLocalStatus] = useState(workOrder.status);
    const [localTransitions, setLocalTransitions] = useState(statusTransitions);
    const [localAllowedTransitions, setLocalAllowedTransitions] = useState(allowedTransitions);

    // RACI state
    const [localRaciValue, setLocalRaciValue] = useState<RaciValue>(
        raciValue ?? {
            responsible_id: workOrder.responsibleId ?? null,
            accountable_id: workOrder.accountableId ?? null,
            consulted_ids: workOrder.consultedIds ?? [],
            informed_ids: workOrder.informedIds ?? [],
        }
    );
    const [isUpdatingRaci, setIsUpdatingRaci] = useState(false);
    const [raciError, setRaciError] = useState<string | null>(null);
    const [assignmentConfirmOpen, setAssignmentConfirmOpen] = useState(false);
    const [pendingAssignmentChange, setPendingAssignmentChange] = useState<{
        role: RaciRole;
        currentUserId: number | null;
        newUserId: number | null;
    } | null>(null);

    // Quick task completion state
    const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);

    // Task drag-and-drop state
    const [localTasks, setLocalTasks] = useState(tasks);
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

    // Task context menu state
    type TaskType = typeof tasks[0];
    const [selectedTask, setSelectedTask] = useState<TaskType | null>(null);
    const [taskTransitionDialogOpen, setTaskTransitionDialogOpen] = useState(false);

    // Task view mode state (list vs board)
    const [taskView, setTaskView] = useState<'list' | 'board'>('list');
    const [taskPromoteDialogOpen, setTaskPromoteDialogOpen] = useState(false);
    const [taskDeleteDialogOpen, setTaskDeleteDialogOpen] = useState(false);
    const [selectedTaskTransition, setSelectedTaskTransition] = useState<string | null>(null);
    const [isTaskTransitioning, setIsTaskTransitioning] = useState(false);
    const [taskTransitionError, setTaskTransitionError] = useState<string | null>(null);

    // Task archive state
    const [showArchivedTasks, setShowArchivedTasks] = useState(false);

    // PM Copilot state
    const [pmCopilotMode, setPMCopilotMode] = useState<PMCopilotMode>(workOrder.pmCopilotMode ?? 'full');
    const [approvedAlternativeId, setApprovedAlternativeId] = useState<string | null>(
        workOrder.pmCopilotSuggestions?.approvedAlternativeId ?? null
    );
    const [rejectedAlternativeIds, setRejectedAlternativeIds] = useState<string[]>(
        workOrder.pmCopilotSuggestions?.rejectedAlternativeIds ?? []
    );
    const [pmCopilotFeedback, setPmCopilotFeedback] = useState<string | null>(null);
    const [pmCopilotError, setPmCopilotError] = useState<string | null>(null);
    const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);

    // PM Copilot hooks
    const { trigger: triggerPMCopilot } = useTriggerPMCopilot();
    const { data: pmCopilotData, fetch: fetchSuggestions } = usePMCopilotSuggestions(workOrder.id);
    const { approve: approveSuggestion, isLoading: isApproving } = useApproveSuggestion(workOrder.id);
    const { reject: rejectSuggestion, isLoading: isRejecting } = useRejectSuggestion(workOrder.id);
    const { delegate: delegatePlan, isLoading: isDelegating, suggestions: aiSuggestions, error: delegationError } = useDelegatePlan(workOrder.id);
    const { confirm: confirmAssignments, isLoading: isConfirmingAssignments } = useConfirmAssignments(workOrder.id);

    // Get suggestions from either prop or fetched data
    const suggestions = workOrder.pmCopilotSuggestions ?? pmCopilotData;

    // Sync approvedAlternativeId and rejectedAlternativeIds from fetched data (survives Inertia reload)
    useEffect(() => {
        const fromProps = workOrder.pmCopilotSuggestions?.approvedAlternativeId;
        const fromFetch = pmCopilotData?.approvedAlternativeId;
        const resolved = fromProps ?? fromFetch ?? null;
        if (resolved) {
            setApprovedAlternativeId(resolved);
        }

        const rejectedFromProps = workOrder.pmCopilotSuggestions?.rejectedAlternativeIds;
        const rejectedFromFetch = pmCopilotData?.rejectedAlternativeIds;
        const resolvedRejected = rejectedFromProps ?? rejectedFromFetch ?? [];
        if (resolvedRejected.length > 0) {
            setRejectedAlternativeIds(resolvedRejected);
        }
    }, [
        workOrder.pmCopilotSuggestions?.approvedAlternativeId,
        pmCopilotData?.approvedAlternativeId,
        workOrder.pmCopilotSuggestions?.rejectedAlternativeIds,
        pmCopilotData?.rejectedAlternativeIds,
    ]);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Work', href: '/work' },
        {
            title: workOrder.projectName,
            href: `/work/projects/${workOrder.projectId}`,
            siblings: siblingProjects.map((p) => ({ title: p.name, href: `/work/projects/${p.id}` })),
        },
        {
            title: workOrder.title,
            href: `/work/work-orders/${workOrder.id}`,
            siblings: siblingWorkOrders.map((wo) => ({ title: wo.title, href: `/work/work-orders/${wo.id}` })),
        },
    ];

    const editForm = useForm({
        title: workOrder.title,
        description: workOrder.description || '',
        status: workOrder.status,
        priority: workOrder.priority as 'low' | 'medium' | 'high' | 'urgent',
        due_date: workOrder.dueDate || '',
        estimated_hours: workOrder.estimatedHours.toString(),
        budget_type: (workOrder.budgetType ?? undefined) as BudgetType | undefined,
        budget_cost: workOrder.budgetCost?.toString() || '',
        budget_hours: workOrder.budgetHours?.toString() || '',
    });

    const taskForm = useForm({
        title: '',
        workOrderId: workOrder.id,
        description: '',
        dueDate: calculateDefaultDueDate(workOrder.dueDate),
        assignedToId: '' as string,
    });

    const deliverableForm = useForm({
        title: '',
        workOrderId: workOrder.id,
        description: '',
        type: 'document' as const,
        fileUrl: '',
        acceptanceCriteria: [] as string[],
    });

    const editDeliverableForm = useForm<{
        title: string;
        description: string;
        type: 'document' | 'design' | 'report' | 'code' | 'other';
        status: 'draft' | 'in_review' | 'approved' | 'delivered';
        version: string;
        fileUrl: string;
        acceptanceCriteria: string[];
    }>({
        title: '',
        description: '',
        type: 'document',
        status: 'draft',
        version: '1.0',
        fileUrl: '',
        acceptanceCriteria: [],
    });

    // Convert team members to RACI user format (memoized to prevent infinite re-renders)
    const raciUsers: RaciUser[] = useMemo(
        () =>
            teamMembers.map((member) => ({
                id: parseInt(member.id, 10),
                name: member.name,
            })),
        [teamMembers]
    );

    // Sync local state with props
    useEffect(() => {
        setLocalStatus(workOrder.status);
    }, [workOrder.status]);

    useEffect(() => {
        setLocalTransitions(statusTransitions);
    }, [statusTransitions]);

    useEffect(() => {
        setLocalAllowedTransitions(allowedTransitions);
    }, [allowedTransitions]);

    useEffect(() => {
        if (raciValue) {
            setLocalRaciValue(raciValue);
        }
    }, [raciValue]);

    // Sync localTasks with props
    useEffect(() => {
        setLocalTasks(tasks);
    }, [tasks]);

    // Handle task drag-and-drop reorder
    const handleTaskDragEnd = useCallback(
        async (event: DragEndEvent) => {
            const { active, over } = event;
            if (!over || active.id === over.id) return;

            const oldIndex = localTasks.findIndex((t) => t.id === active.id);
            const newIndex = localTasks.findIndex((t) => t.id === over.id);
            const newOrder = arrayMove(localTasks, oldIndex, newIndex);

            // Optimistic update
            setLocalTasks(newOrder);

            // Persist to backend
            try {
                await fetch(`/work/work-orders/${workOrder.id}/tasks/reorder`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-XSRF-TOKEN': getCsrfToken(),
                    },
                    body: JSON.stringify({ taskIds: newOrder.map((t) => t.id) }),
                });
            } catch (error) {
                // Revert on error
                setLocalTasks(tasks);
                console.error('Failed to reorder tasks:', error);
            }
        },
        [localTasks, workOrder.id, tasks]
    );

    const handleUpdateWorkOrder = (e: React.FormEvent) => {
        e.preventDefault();
        editForm.patch(`/work/work-orders/${workOrder.id}`, {
            preserveScroll: true,
            onSuccess: () => setEditDialogOpen(false),
        });
    };

    const handleCreateTask = (e: React.FormEvent) => {
        e.preventDefault();
        taskForm.post('/work/tasks', {
            preserveScroll: true,
            onSuccess: () => {
                taskForm.reset();
                setCreateTaskDialogOpen(false);
            },
        });
    };

    const openCreateTaskDialog = () => {
        taskForm.setData({
            title: '',
            workOrderId: workOrder.id,
            description: '',
            dueDate: calculateDefaultDueDate(workOrder.dueDate),
            assignedToId: '',
        });
        setCreateTaskDialogOpen(true);
    };

    const handleCreateDeliverable = (e: React.FormEvent) => {
        e.preventDefault();
        deliverableForm.post('/work/deliverables', {
            preserveScroll: true,
            onSuccess: () => {
                deliverableForm.reset();
                setNewCriterion('');
                setCreateDeliverableDialogOpen(false);
            },
        });
    };

    const handleEditDeliverable = (deliverable: typeof deliverables[0]) => {
        setSelectedDeliverable(deliverable);
        editDeliverableForm.setData({
            title: deliverable.title,
            description: deliverable.description || '',
            type: deliverable.type as 'document' | 'design' | 'report' | 'code' | 'other',
            status: deliverable.status as 'draft' | 'in_review' | 'approved' | 'delivered',
            version: deliverable.version,
            fileUrl: deliverable.fileUrl || '',
            acceptanceCriteria: deliverable.acceptanceCriteria || [],
        });
        setEditDeliverableDialogOpen(true);
    };

    const handleUpdateDeliverable = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedDeliverable) return;
        editDeliverableForm.patch(`/work/deliverables/${selectedDeliverable.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                setEditDeliverableDialogOpen(false);
                setSelectedDeliverable(null);
                setEditCriterion('');
            },
        });
    };

    const handleDeleteDeliverable = () => {
        if (!selectedDeliverable) return;
        router.delete(`/work/deliverables/${selectedDeliverable.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                setDeleteDeliverableDialogOpen(false);
                setSelectedDeliverable(null);
            },
        });
    };

    const handleDeliverableStatusChange = (deliverableId: string, newStatus: string) => {
        router.patch(`/work/deliverables/${deliverableId}`, { status: newStatus });
    };

    // Acceptance criteria helpers for create form
    const addCriterion = () => {
        if (newCriterion.trim()) {
            deliverableForm.setData('acceptanceCriteria', [
                ...deliverableForm.data.acceptanceCriteria,
                newCriterion.trim(),
            ]);
            setNewCriterion('');
        }
    };

    const removeCriterion = (index: number) => {
        deliverableForm.setData(
            'acceptanceCriteria',
            deliverableForm.data.acceptanceCriteria.filter((_, i) => i !== index)
        );
    };

    // Acceptance criteria helpers for edit form
    const addEditCriterion = () => {
        if (editCriterion.trim()) {
            editDeliverableForm.setData('acceptanceCriteria', [
                ...editDeliverableForm.data.acceptanceCriteria,
                editCriterion.trim(),
            ]);
            setEditCriterion('');
        }
    };

    const removeEditCriterion = (index: number) => {
        editDeliverableForm.setData(
            'acceptanceCriteria',
            editDeliverableForm.data.acceptanceCriteria.filter((_, i) => i !== index)
        );
    };

    const handleDelete = () => {
        if (confirm('Are you sure you want to delete this work order? This action cannot be undone.')) {
            router.delete(`/work/work-orders/${workOrder.id}`);
        }
    };

    /**
     * Handle transition button click - open dialog for transitions that need confirmation
     */
    const handleTransitionSelect = useCallback((targetStatus: string) => {
        setSelectedTransition(targetStatus);
        setTransitionDialogOpen(true);
        setTransitionError(null);
    }, []);

    /**
     * Execute the transition via API
     */
    const handleTransitionConfirm = useCallback(
        async (comment?: string) => {
            if (!selectedTransition) return;

            setIsTransitioning(true);
            setTransitionError(null);

            try {
                const response = await fetch(`/work/work-orders/${workOrder.id}/transition`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-XSRF-TOKEN': getCsrfToken(),
                    },
                    body: JSON.stringify({
                        status: selectedTransition,
                        comment: comment || undefined,
                    }),
                });

                const data = await response.json();

                if (!response.ok) {
                    setTransitionError(data.message || 'Failed to update status');
                    return;
                }

                // Update local state with the new status and transitions
                setLocalStatus(data.workOrder.status);
                if (data.workOrder.statusTransitions) {
                    setLocalTransitions(
                        data.workOrder.statusTransitions.map(
                            (t: {
                                id: string;
                                from_status: string;
                                to_status: string;
                                user_id: string | null;
                                comment: string | null;
                                created_at: string;
                            }) => ({
                                id: parseInt(t.id, 10),
                                fromStatus: t.from_status,
                                toStatus: t.to_status,
                                user: { id: parseInt(t.user_id || '0', 10), name: 'User', email: '' },
                                createdAt: t.created_at,
                                comment: t.comment,
                                commentCategory: null,
                            })
                        )
                    );
                }

                // Update allowed transitions based on new status
                updateAllowedTransitions(data.workOrder.status);

                setTransitionDialogOpen(false);
                setSelectedTransition(null);

                // Reload page to get fresh data
                router.reload({ only: ['workOrder', 'statusTransitions', 'allowedTransitions', 'rejectionFeedback'] });
            } catch (error) {
                setTransitionError('An error occurred while updating the status');
            } finally {
                setIsTransitioning(false);
            }
        },
        [selectedTransition, workOrder.id]
    );

    /**
     * Update allowed transitions based on new status
     */
    const updateAllowedTransitions = useCallback((newStatus: string) => {
        const transitionMap: Record<string, TransitionOption[]> = {
            draft: [
                { value: 'active', label: 'Start Work Order' },
                { value: 'cancelled', label: 'Cancel', destructive: true },
            ],
            active: [
                { value: 'in_review', label: 'Submit for Review' },
                { value: 'delivered', label: 'Mark as Delivered' },
                { value: 'blocked', label: 'Mark as Blocked' },
                { value: 'cancelled', label: 'Cancel', destructive: true },
            ],
            in_review: [
                { value: 'approved', label: 'Approve' },
                { value: 'revision_requested', label: 'Request Changes' },
                { value: 'cancelled', label: 'Cancel', destructive: true },
            ],
            approved: [
                { value: 'delivered', label: 'Mark as Delivered' },
                { value: 'revision_requested', label: 'Request Changes' },
                { value: 'cancelled', label: 'Cancel', destructive: true },
            ],
            blocked: [
                { value: 'active', label: 'Unblock' },
                { value: 'cancelled', label: 'Cancel', destructive: true },
            ],
            delivered: [],
            cancelled: [],
            revision_requested: [],
        };
        setLocalAllowedTransitions(transitionMap[newStatus] || []);
    }, []);

    const handleTransitionCancel = useCallback(() => {
        setTransitionDialogOpen(false);
        setSelectedTransition(null);
        setTransitionError(null);
    }, []);

    /**
     * Handle RACI value change
     */
    const handleRaciChange = useCallback(
        async (newValue: RaciValue) => {
            setLocalRaciValue(newValue);
            setRaciError(null);
            setIsUpdatingRaci(true);

            try {
                const response = await fetch(`/work/work-orders/${workOrder.id}/raci`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-XSRF-TOKEN': getCsrfToken(),
                    },
                    body: JSON.stringify({
                        accountable_id: newValue.accountable_id,
                        responsible_id: newValue.responsible_id,
                        consulted_ids: newValue.consulted_ids,
                        informed_ids: newValue.informed_ids,
                        confirmed: true,
                    }),
                });

                const data = await response.json();

                if (!response.ok) {
                    setRaciError(data.message || 'Failed to update RACI assignments');
                    return;
                }

                // Reload to get fresh data
                router.reload({ only: ['workOrder', 'raciValue'] });
            } catch (error) {
                setRaciError('An error occurred while updating RACI assignments');
            } finally {
                setIsUpdatingRaci(false);
            }
        },
        [workOrder.id]
    );

    /**
     * Handle RACI confirmation requirement
     */
    const handleRaciConfirmationRequired = useCallback(
        (role: RaciRole, currentUserId: number | null, newUserId: number | null) => {
            setPendingAssignmentChange({ role, currentUserId, newUserId });
            setAssignmentConfirmOpen(true);
        },
        []
    );

    /**
     * Confirm RACI assignment change
     */
    const handleAssignmentConfirm = useCallback(async () => {
        if (!pendingAssignmentChange) return;

        const { role, newUserId } = pendingAssignmentChange;
        const updatedValue: RaciValue = {
            ...localRaciValue,
            [`${role}_id`]: newUserId,
        };

        setAssignmentConfirmOpen(false);
        setPendingAssignmentChange(null);

        await handleRaciChange(updatedValue);
    }, [pendingAssignmentChange, localRaciValue, handleRaciChange]);

    /**
     * Cancel RACI assignment change
     */
    const handleAssignmentCancel = useCallback(() => {
        setAssignmentConfirmOpen(false);
        setPendingAssignmentChange(null);
    }, []);

    /**
     * Handle PM Copilot trigger
     */
    const handlePMCopilotTrigger = useCallback(async () => {
        setPmCopilotFeedback(null);
        setPmCopilotError(null);
        setIsGeneratingPlan(true);

        try {
            const result = await triggerPMCopilot(workOrder.id);
            if (!result.success) {
                setPmCopilotError(`Failed to generate plan: ${result.error || 'Unknown error'}`);
                return;
            }

            // Workflow runs asynchronously — poll for completion
            setPmCopilotFeedback('Generating plan…');

            const maxAttempts = 60; // ~2 minutes with 2s intervals
            const pollInterval = 2000;

            for (let attempt = 0; attempt < maxAttempts; attempt++) {
                await new Promise((resolve) => setTimeout(resolve, pollInterval));

                const suggestionsResult = await fetchSuggestions();
                const status = suggestionsResult?.data?.workflowState?.status;

                if (status === 'completed' || status === 'paused') {
                    const alternatives = suggestionsResult?.data?.alternatives ?? [];
                    if (alternatives.length > 0) {
                        const totalDeliverables = alternatives.reduce((sum: number, alt: { deliverables?: unknown[] }) => sum + (alt.deliverables?.length ?? 0), 0);
                        const totalTasks = alternatives.reduce((sum: number, alt: { tasks?: unknown[] }) => sum + (alt.tasks?.length ?? 0), 0);
                        const parts: string[] = [`${alternatives.length} alternative${alternatives.length !== 1 ? 's' : ''}`];
                        if (totalDeliverables > 0) parts.push(`${totalDeliverables} deliverable${totalDeliverables !== 1 ? 's' : ''}`);
                        if (totalTasks > 0) parts.push(`${totalTasks} task${totalTasks !== 1 ? 's' : ''}`);
                        setPmCopilotFeedback(`Plan generated — ${parts.join(' with ')} suggested.`);
                    } else {
                        setPmCopilotFeedback('Plan generated — review the suggestions below.');
                    }
                    return;
                }

                // Check for error in state data
                if (suggestionsResult?.data?.workflowState?.error) {
                    setPmCopilotError(`Plan generation failed: ${suggestionsResult.data.workflowState.error}`);
                    setPmCopilotFeedback(null);
                    return;
                }
            }

            setPmCopilotError('Plan generation timed out. Please check back later.');
            setPmCopilotFeedback(null);
        } finally {
            setIsGeneratingPlan(false);
        }
    }, [triggerPMCopilot, workOrder.id, fetchSuggestions]);

    /**
     * Handle PM Copilot suggestion approval
     */
    const handleApproveSuggestion = useCallback(async (alternativeId: string) => {
        const result = await approveSuggestion(alternativeId);
        if (result.success) {
            setApprovedAlternativeId(alternativeId);
            // Also re-fetch suggestions so approvedAlternativeId is persisted from backend
            fetchSuggestions();
        }
    }, [approveSuggestion, fetchSuggestions]);

    /**
     * Handle PM Copilot suggestion rejection
     */
    const handleRejectSuggestion = useCallback(async (alternativeId: string, reason?: string) => {
        const result = await rejectSuggestion(alternativeId, reason);
        if (result.success) {
            setRejectedAlternativeIds((prev) => [...prev, alternativeId]);
            fetchSuggestions();
        }
    }, [rejectSuggestion, fetchSuggestions]);

    /**
     * Handle PM Copilot mode change
     */
    const handlePMCopilotModeChange = useCallback((newMode: PMCopilotMode) => {
        setPMCopilotMode(newMode);
    }, []);

    /**
     * Task context menu handlers
     */
    const handleTaskStatusChange = useCallback((task: TaskType) => {
        setSelectedTask(task);
        setTaskTransitionDialogOpen(true);
    }, []);

    const handleTaskPromote = useCallback((task: TaskType) => {
        setSelectedTask(task);
        setTaskPromoteDialogOpen(true);
    }, []);

    const handleTaskDelete = useCallback((task: TaskType) => {
        setSelectedTask(task);
        setTaskDeleteDialogOpen(true);
    }, []);

    const handleTaskArchive = useCallback((task: TaskType) => {
        if (task.status === 'archived') {
            router.post(`/work/tasks/${task.id}/restore`, {}, { preserveScroll: true });
        } else {
            router.post(`/work/tasks/${task.id}/archive`, {}, { preserveScroll: true });
        }
    }, []);

    const handleBulkArchiveCompletedTasks = useCallback(() => {
        router.post(`/work/work-orders/${workOrder.id}/tasks/bulk-archive-completed`, {}, { preserveScroll: true });
    }, [workOrder.id]);

    const handleTaskTransitionConfirm = useCallback(async () => {
        if (!selectedTask || !selectedTaskTransition) return;

        setIsTaskTransitioning(true);
        setTaskTransitionError(null);

        try {
            const response = await fetch(`/work/tasks/${selectedTask.id}/transition`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-XSRF-TOKEN': getCsrfToken(),
                },
                body: JSON.stringify({ status: selectedTaskTransition }),
            });

            if (!response.ok) {
                const data = await response.json();
                setTaskTransitionError(data.message || 'Failed to update task status');
                return;
            }

            // Close dialog and reload page data
            setTaskTransitionDialogOpen(false);
            setSelectedTask(null);
            setSelectedTaskTransition(null);
            setTaskTransitionError(null);

            // Reload to get fresh task data
            router.reload({ only: ['tasks'] });
        } catch (error) {
            setTaskTransitionError('An error occurred while updating the task status');
        } finally {
            setIsTaskTransitioning(false);
        }
    }, [selectedTask, selectedTaskTransition]);

    const handleTaskDeleteConfirm = useCallback(() => {
        if (!selectedTask) return;

        router.delete(`/work/tasks/${selectedTask.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                setTaskDeleteDialogOpen(false);
                setSelectedTask(null);
            },
        });
    }, [selectedTask]);

    const getTaskStatusOptions = useCallback((currentStatus: string) => {
        const transitionMap: Record<string, Array<{ value: string; label: string }>> = {
            todo: [
                { value: 'in_progress', label: 'Start Work' },
                { value: 'cancelled', label: 'Cancel' },
            ],
            in_progress: [
                { value: 'in_review', label: 'Submit for Review' },
                { value: 'done', label: 'Mark as Done' },
                { value: 'blocked', label: 'Mark as Blocked' },
                { value: 'cancelled', label: 'Cancel' },
            ],
            in_review: [
                { value: 'done', label: 'Approve' },
                { value: 'in_progress', label: 'Request Changes' },
                { value: 'cancelled', label: 'Cancel' },
            ],
            blocked: [
                { value: 'in_progress', label: 'Unblock' },
                { value: 'cancelled', label: 'Cancel' },
            ],
            done: [],
            cancelled: [],
        };
        return transitionMap[currentStatus] || [];
    }, []);

    /**
     * Quick task completion - mark task as done from work order view
     */
    const handleQuickTaskComplete = useCallback(
        async (taskId: string, currentStatus: string, e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();

            // Only allow completing tasks that can be marked as done
            // Tasks in 'in_review', 'blocked', 'done', 'cancelled', or 'approved' cannot be quick-completed
            const nonCompletableStatuses = ['done', 'cancelled', 'in_review', 'blocked', 'approved'];
            if (nonCompletableStatuses.includes(currentStatus)) return;

            setCompletingTaskId(taskId);

            const transitionTo = async (status: string): Promise<{ ok: boolean; message?: string }> => {
                const response = await fetch(`/work/tasks/${taskId}/transition`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-XSRF-TOKEN': getCsrfToken(),
                    },
                    body: JSON.stringify({ status }),
                });

                if (!response.ok) {
                    const data = await response.json();
                    return { ok: false, message: data.message };
                }
                return { ok: true };
            };

            try {
                // For 'todo' tasks, first transition to 'in_progress'
                // Workflow rules: todo → in_progress → done
                if (currentStatus === 'todo') {
                    const result = await transitionTo('in_progress');
                    if (!result.ok) {
                        console.error('Task transition failed:', result.message);
                        return;
                    }
                }

                // Then transition to 'done'
                const result = await transitionTo('done');
                if (result.ok) {
                    // Reorder: move the completed task after all non-done/non-archived tasks
                    const updatedTasks = localTasks.map((t) =>
                        t.id === taskId ? { ...t, status: 'done' } : t
                    );
                    const notDone = updatedTasks.filter((t) => t.status !== 'done' && t.status !== 'archived');
                    const done = updatedTasks.filter((t) => t.status === 'done' || t.status === 'archived');
                    const reordered = [...notDone, ...done];
                    setLocalTasks(reordered);

                    // Persist new order to backend
                    fetch(`/work/work-orders/${workOrder.id}/tasks/reorder`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Requested-With': 'XMLHttpRequest',
                            'X-XSRF-TOKEN': getCsrfToken(),
                        },
                        body: JSON.stringify({ taskIds: reordered.map((t) => t.id) }),
                    }).catch(() => {});

                    router.reload({ only: ['tasks'] });
                } else {
                    console.error('Task transition failed:', result.message);
                }
            } catch (error) {
                console.error('Task transition error:', error);
            } finally {
                setCompletingTaskId(null);
            }
        },
        [localTasks, workOrder.id]
    );

    // Helper functions for assignment confirmation dialog
    const getCurrentAssignmentForDialog = (): AssignmentChange | null => {
        if (!pendingAssignmentChange) return null;
        const { role, currentUserId } = pendingAssignmentChange;
        const user = raciUsers.find((u) => u.id === currentUserId);
        if (!user) return null;
        const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);
        return { role: roleLabel as AssignmentChange['role'], user };
    };

    const getNewAssignmentForDialog = (): AssignmentChange | null => {
        if (!pendingAssignmentChange) return null;
        const { role, newUserId } = pendingAssignmentChange;
        const user = raciUsers.find((u) => u.id === newUserId);
        if (!user) return null;
        const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);
        return { role: roleLabel as AssignmentChange['role'], user };
    };

    const nonArchivedTasks = tasks.filter((t) => t.status !== 'archived');
    const completedTasks = nonArchivedTasks.filter((t) => t.status === 'done').length;
    const progress = nonArchivedTasks.length > 0 ? Math.round((completedTasks / nonArchivedTasks.length) * 100) : 0;
    const hasDoneTasks = tasks.some((t) => t.status === 'done');
    const hasArchivedTasks = tasks.some((t) => t.status === 'archived');
    const displayTasks = showArchivedTasks ? localTasks : localTasks.filter((t) => t.status !== 'archived');

    const dueDate = workOrder.dueDate ? new Date(workOrder.dueDate) : null;
    const now = new Date();
    const daysUntilDue = dueDate ? Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0;
    const isOverdue = dueDate ? daysUntilDue < 0 : false;

    // Get the label for the selected transition
    const selectedTransitionLabel = selectedTransition
        ? workOrderStatusLabels[selectedTransition as keyof typeof workOrderStatusLabels] || selectedTransition
        : '';

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={workOrder.title} />

            <div className="flex h-full flex-1 flex-col">
                {/* Rejection Feedback Banner */}
                {rejectionFeedback && (
                    <div className="px-6 pt-6">
                        <Alert className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/50">
                            <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                            <AlertTitle className="text-orange-900 dark:text-orange-100">
                                Revision Requested
                            </AlertTitle>
                            <AlertDescription className="text-orange-800 dark:text-orange-200">
                                <p className="mt-1">{rejectionFeedback.comment}</p>
                                <p className="mt-2 text-sm text-orange-600 dark:text-orange-400">
                                    Requested by {rejectionFeedback.user.name} on{' '}
                                    {new Date(rejectionFeedback.createdAt).toLocaleDateString()}
                                </p>
                            </AlertDescription>
                        </Alert>
                    </div>
                )}

                {/* Header */}
                <div className="border-sidebar-border/70 dark:border-sidebar-border border-b px-6 py-6">
                    <div className="mb-4 flex items-center gap-4">
                        <Button variant="ghost" size="icon" asChild>
                            <Link href={`/work/projects/${workOrder.projectId}`}>
                                <ArrowLeft className="h-4 w-4" />
                            </Link>
                        </Button>
                        <div className="flex-1">
                            <div className="mb-1 flex items-center gap-3">
                                <h1 className="text-foreground text-2xl font-bold">{workOrder.title}</h1>
                                <StatusBadge status={localStatus} type="workOrder" />
                                <PriorityBadge priority={workOrder.priority as 'low' | 'medium' | 'high' | 'urgent'} />
                            </div>
                            <p className="text-muted-foreground">
                                {workOrder.projectName}
                                {workOrder.description && ` - ${workOrder.description}`}
                            </p>
                        </div>

                        {/* Transition Button */}
                        {localAllowedTransitions.length > 0 && (
                            <TransitionButton
                                currentStatus={localStatus}
                                allowedTransitions={localAllowedTransitions}
                                onTransition={handleTransitionSelect}
                                isLoading={isTransitioning}
                            />
                        )}

                        <div className="flex items-center gap-2">
                            {/* Client Comms Button */}
                            <DraftClientUpdateButton
                                entityType="work_order"
                                entityId={workOrder.id}
                            />
                            {/* Communications Button */}
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCommsPanelOpen(true)}
                                aria-label="Communications"
                            >
                                <MessageSquare className="mr-2 h-4 w-4" />
                                {communicationThread?.messageCount || 0} Messages
                            </Button>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="icon">
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
                                        <Edit className="mr-2 h-4 w-4" />
                                        Edit
                                    </DropdownMenuItem>
                                    {workOrder.status === 'archived' ? (
                                        <DropdownMenuItem onClick={() => router.post(`/work/work-orders/${workOrder.id}/restore`, {}, { preserveScroll: true })}>
                                            <ArchiveRestore className="mr-2 h-4 w-4" />
                                            Unarchive
                                        </DropdownMenuItem>
                                    ) : (
                                        <DropdownMenuItem onClick={() => router.post(`/work/work-orders/${workOrder.id}/archive`, {}, { preserveScroll: true })}>
                                            <Archive className="mr-2 h-4 w-4" />
                                            Archive
                                        </DropdownMenuItem>
                                    )}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>

                    {/* Work Order Stats */}
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
                        <div className="bg-muted flex items-center gap-3 rounded-lg p-3">
                            <User className="text-muted-foreground h-5 w-5" />
                            <div>
                                <div className="text-muted-foreground text-xs">Accountable</div>
                                <div className="font-medium">{workOrder.accountableName || 'Unassigned'}</div>
                            </div>
                        </div>
                        <div className="bg-muted flex items-center gap-3 rounded-lg p-3">
                            <Clock className="text-muted-foreground h-5 w-5" />
                            <div>
                                <div className="text-muted-foreground text-xs">Hours</div>
                                <div className="font-medium">
                                    {workOrder.actualHours} / {workOrder.estimatedHours}h
                                </div>
                            </div>
                        </div>
                        <div
                            className={`flex items-center gap-3 rounded-lg p-3 ${
                                isOverdue ? 'bg-destructive/10' : 'bg-muted'
                            }`}
                        >
                            <Calendar
                                className={`h-5 w-5 ${isOverdue ? 'text-destructive' : 'text-muted-foreground'}`}
                            />
                            <div>
                                <div className="text-muted-foreground text-xs">Due Date</div>
                                <div className={`font-medium ${isOverdue ? 'text-destructive' : ''}`}>
                                    {dueDate ? (
                                        <>
                                            {dueDate.toLocaleDateString()}
                                            {isOverdue && ` (${Math.abs(daysUntilDue)}d overdue)`}
                                        </>
                                    ) : (
                                        <span className="text-muted-foreground">Not set</span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="bg-muted flex items-center gap-3 rounded-lg p-3">
                            <CheckCircle2 className="text-muted-foreground h-5 w-5" />
                            <div>
                                <div className="text-muted-foreground text-xs">Tasks</div>
                                <div className="font-medium">
                                    {completedTasks} / {tasks.length}
                                </div>
                            </div>
                        </div>
                        <div className="bg-muted flex items-center gap-3 rounded-lg p-3">
                            <FileText className="text-muted-foreground h-5 w-5" />
                            <div>
                                <div className="text-muted-foreground text-xs">Deliverables</div>
                                <div className="font-medium">{deliverables.length}</div>
                            </div>
                        </div>
                    </div>

                    {/* Progress Indicators */}
                    <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                        {/* Task Progress */}
                        <div>
                            <div className="mb-2 flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Task Progress</span>
                                <span className="font-medium">{progress}%</span>
                            </div>
                            <ProgressBar progress={progress} />
                        </div>

                        {/* Hours Progress */}
                        <div className="bg-card border-border rounded-lg border p-4">
                            <h3 className="text-foreground mb-2 text-sm font-medium">
                                Actual vs Estimated Hours
                            </h3>
                            <HoursProgressIndicator
                                actualHours={workOrder.actualHours}
                                estimatedHours={workOrder.estimatedHours}
                            />
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 overflow-auto p-6">
                    {/* View Toggle Row (full width) */}
                    {localTasks.length > 0 && (
                        <div className="mb-4 flex justify-start">
                            <Tabs value={taskView} onValueChange={(v) => setTaskView(v as 'list' | 'board')}>
                                <TabsList>
                                    <TabsTrigger value="list">
                                        <List className="mr-2 h-4 w-4" />
                                        List
                                    </TabsTrigger>
                                    <TabsTrigger value="board">
                                        <LayoutGrid className="mr-2 h-4 w-4" />
                                        Board
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>
                    )}

                    {/* Conditional Layout Based on View */}
                    {taskView === 'board' && displayTasks.length > 0 ? (
                        /* Full-width board view */
                        <div className="h-[calc(100vh-320px)] min-h-[400px]">
                            <TaskKanbanBoard tasks={displayTasks} workOrderId={workOrder.id} />
                        </div>
                    ) : (
                        /* 3-column grid layout for list view */
                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                            {/* Column 1: Tasks Section */}
                            <div>
                                <div className="mb-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <h2 className="text-foreground text-lg font-bold">Tasks</h2>
                                        <span className="text-muted-foreground text-sm font-normal">{completedTasks}/{nonArchivedTasks.length}</span>
                                        {hasArchivedTasks && (
                                            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={showArchivedTasks}
                                                    onChange={(e) => setShowArchivedTasks(e.target.checked)}
                                                    className="rounded border-muted-foreground/50"
                                                />
                                                Show archived
                                            </label>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {hasDoneTasks && (
                                            <Button variant="outline" size="sm" onClick={handleBulkArchiveCompletedTasks}>
                                                <Archive className="mr-2 h-4 w-4" />
                                                Archive completed
                                            </Button>
                                        )}
                                        <Button size="sm" onClick={openCreateTaskDialog}>
                                            <Plus className="mr-2 h-4 w-4" />
                                            Add Task
                                        </Button>
                                    </div>
                                </div>
                                {displayTasks.length === 0 ? (
                                    <div className="bg-muted/50 rounded-xl py-8 text-center">
                                        <p className="text-muted-foreground mb-4">No tasks yet</p>
                                        <Button onClick={openCreateTaskDialog}>
                                            Create Task
                                        </Button>
                                    </div>
                                ) : (
                                    <DndContext
                                        sensors={sensors}
                                        collisionDetection={closestCenter}
                                        onDragEnd={handleTaskDragEnd}
                                    >
                                        <SortableContext
                                            items={displayTasks.map((t) => t.id)}
                                            strategy={verticalListSortingStrategy}
                                        >
                                            <div className="space-y-3">
                                                {displayTasks.map((task) => (
                                                    <SortableTaskCard
                                                        key={task.id}
                                                        task={task}
                                                        completingTaskId={completingTaskId}
                                                        onQuickComplete={handleQuickTaskComplete}
                                                        onStatusChange={handleTaskStatusChange}
                                                        onPromote={handleTaskPromote}
                                                        onDelete={handleTaskDelete}
                                                        onArchive={handleTaskArchive}
                                                        getStatusOptions={getTaskStatusOptions}
                                                    />
                                                ))}
                                            </div>
                                        </SortableContext>
                                    </DndContext>
                                )}
                            </div>

                            {/* Column 2: Deliverables Section */}
                            <div>
                                <div className="mb-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <h2 className="text-foreground text-lg font-bold">Deliverables</h2>
                                        <span className="text-muted-foreground text-sm font-normal">{deliverables.length}</span>
                                    </div>
                                    <Button variant="outline" size="sm" onClick={() => setCreateDeliverableDialogOpen(true)}>
                                        <Plus className="mr-2 h-4 w-4" />
                                        Add
                                    </Button>
                                </div>

                                {deliverables.length === 0 ? (
                                    <div className="bg-muted/50 rounded-xl py-8 text-center">
                                        <FileText className="text-muted-foreground mx-auto mb-2 h-8 w-8" />
                                        <p className="text-muted-foreground">No deliverables yet</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {deliverables.map((d) => (
                                            <div
                                                key={d.id}
                                                className="bg-card border-border hover:border-primary/50 rounded-lg border p-4 transition-colors"
                                            >
                                                <div className="flex items-start justify-between">
                                                    <Link
                                                        href={`/work/deliverables/${d.id}`}
                                                        className="min-w-0 flex-1"
                                                    >
                                                        <div className="mb-1 flex flex-wrap items-center gap-2">
                                                            <span className="truncate font-medium">{d.title}</span>
                                                            <StatusBadge status={d.status} type="deliverable" />
                                                        </div>
                                                        <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
                                                            <span className="capitalize">{d.type}</span>
                                                            <span>-</span>
                                                            <span>v{d.version}</span>
                                                        </div>
                                                    </Link>
                                                    <div className="ml-2 flex items-center gap-1">
                                                        {d.status === 'draft' && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    handleDeliverableStatusChange(d.id, 'in_review');
                                                                }}
                                                            >
                                                                Submit
                                                            </Button>
                                                        )}
                                                        {d.fileUrl && (
                                                            <Button variant="ghost" size="icon" asChild>
                                                                <a href={d.fileUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                                                                    <ExternalLink className="h-4 w-4" />
                                                                </a>
                                                            </Button>
                                                        )}
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon" onClick={(e) => e.preventDefault()}>
                                                                    <MoreVertical className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuItem onClick={() => handleEditDeliverable(d)}>
                                                                    <Edit className="mr-2 h-4 w-4" />
                                                                    Edit
                                                                </DropdownMenuItem>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem
                                                                    onClick={() => {
                                                                        setSelectedDeliverable(d);
                                                                        setDeleteDeliverableDialogOpen(true);
                                                                    }}
                                                                    className="text-destructive"
                                                                >
                                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                                    Delete
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Column 3: PM Copilot + RACI + Activity */}
                            <div>
                                {/* PM Copilot Section */}
                                <div className="mb-6 space-y-4">
                                    <PMCopilotTriggerButton
                                        workOrderId={workOrder.id}
                                        onTrigger={handlePMCopilotTrigger}
                                        isRunning={isGeneratingPlan}
                                        disabled={isApproving || isRejecting}
                                        feedbackMessage={pmCopilotFeedback}
                                        feedbackError={pmCopilotError}
                                        hasExistingPlan={deliverables.length > 0}
                                    />

                                    <PMCopilotSettingsToggle
                                        workOrderId={workOrder.id}
                                        currentMode={pmCopilotMode}
                                        onChange={handlePMCopilotModeChange}
                                        disabled={isGeneratingPlan}
                                    />

                                    {suggestions?.alternatives && suggestions.alternatives.length > 0 && (
                                        <PlanAlternativesPanel
                                            alternatives={suggestions.alternatives}
                                            onApprove={handleApproveSuggestion}
                                            onReject={handleRejectSuggestion}
                                            selectedAlternativeId={approvedAlternativeId}
                                            rejectedAlternativeIds={rejectedAlternativeIds}
                                            isLoading={isApproving || isRejecting}
                                        />
                                    )}

                                    {tasks.length > 0 && (
                                        <PlanExecutionPanel
                                            workOrderId={workOrder.id}
                                            tasks={tasks}
                                            teamMembers={teamMembers}
                                            availableAgents={availableAgents}
                                            onConfirmAssignments={(assignments) =>
                                                confirmAssignments(assignments)
                                            }
                                            onDelegateAll={() => delegatePlan()}
                                            isDelegating={isDelegating}
                                            isConfirming={isConfirmingAssignments}
                                            aiSuggestions={aiSuggestions}
                                            delegationError={delegationError}
                                        />
                                    )}
                                </div>

                                {/* RACI Assignments Section */}
                                <div className="mb-4 flex items-center gap-2">
                                    <Users className="text-muted-foreground h-5 w-5" />
                                    <h2 className="text-foreground text-lg font-bold">RACI Assignments</h2>
                                </div>
                                <div className="bg-card border-border rounded-xl border p-4">
                                    <RaciSelector
                                        value={localRaciValue}
                                        onChange={handleRaciChange}
                                        users={raciUsers}
                                        entityType="work_order"
                                        disabled={isUpdatingRaci}
                                        onConfirmationRequired={handleRaciConfirmationRequired}
                                    />
                                    {raciError && (
                                        <p className="text-destructive mt-2 text-sm">{raciError}</p>
                                    )}
                                </div>

                                {/* Acceptance Criteria */}
                                {workOrder.acceptanceCriteria.length > 0 && (
                                    <div className="mt-6">
                                        <h3 className="text-foreground mb-3 text-sm font-bold">
                                            Acceptance Criteria
                                        </h3>
                                        <ul className="space-y-2">
                                            {workOrder.acceptanceCriteria.map((criteria, i) => (
                                                <li key={i} className="flex items-start gap-2 text-sm">
                                                    <Checkbox disabled />
                                                    <span>{criteria}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* Activity / Transition History */}
                                <div className="mt-6">
                                    <div className="mb-4 flex items-center gap-2">
                                        <History className="text-muted-foreground h-5 w-5" />
                                        <h2 className="text-foreground text-lg font-bold">Activity</h2>
                                    </div>
                                    <div className="bg-card border-border rounded-xl border p-4">
                                        <TransitionHistory transitions={localTransitions} variant="work_order" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Documents Section */}
                <div className="px-6 py-6">
                    <ProjectDocumentsSection
                        projectId={workOrder.projectId}
                        documents={documents}
                        folders={folders}
                        uploadUrl={`/work/work-orders/${workOrder.id}/files`}
                        deleteUrlPrefix={`/work/work-orders/${workOrder.id}/files`}
                    />
                </div>
            </div>

            {/* Communications Panel */}
            <CommunicationsPanel
                threadableType="work-orders"
                threadableId={workOrder.id}
                open={commsPanelOpen}
                onOpenChange={setCommsPanelOpen}
            />

            {/* Transition Dialog */}
            <TransitionDialog
                isOpen={transitionDialogOpen}
                targetStatus={selectedTransition || ''}
                targetLabel={selectedTransitionLabel}
                onConfirm={handleTransitionConfirm}
                onCancel={handleTransitionCancel}
                isLoading={isTransitioning}
                error={transitionError}
            />

            {/* Assignment Confirmation Dialog */}
            {pendingAssignmentChange && getCurrentAssignmentForDialog() && getNewAssignmentForDialog() && (
                <AssignmentConfirmationDialog
                    isOpen={assignmentConfirmOpen}
                    currentAssignment={getCurrentAssignmentForDialog()!}
                    newAssignment={getNewAssignmentForDialog()!}
                    onConfirm={handleAssignmentConfirm}
                    onCancel={handleAssignmentCancel}
                    isLoading={isUpdatingRaci}
                />
            )}

            {/* Edit Dialog */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    <form onSubmit={handleUpdateWorkOrder}>
                        <DialogHeader>
                            <DialogTitle>Edit Work Order</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label>Title</Label>
                                <Input
                                    value={editForm.data.title}
                                    onChange={(e) => editForm.setData('title', e.target.value)}
                                />
                                <InputError message={editForm.errors.title} />
                            </div>
                            <div className="grid gap-2">
                                <Label>Priority</Label>
                                <Select
                                    value={editForm.data.priority}
                                    onValueChange={(v) => editForm.setData('priority', v as any)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="low">Low</SelectItem>
                                        <SelectItem value="medium">Medium</SelectItem>
                                        <SelectItem value="high">High</SelectItem>
                                        <SelectItem value="urgent">Urgent</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label>Due Date</Label>
                                    <Input
                                        type="date"
                                        value={editForm.data.due_date}
                                        onChange={(e) => editForm.setData('due_date', e.target.value)}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Estimated Hours</Label>
                                    <Input
                                        type="number"
                                        value={editForm.data.estimated_hours}
                                        onChange={(e) => editForm.setData('estimated_hours', e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label>Description</Label>
                                <Input
                                    value={editForm.data.description}
                                    onChange={(e) => editForm.setData('description', e.target.value)}
                                />
                            </div>

                            {/* Budget Fields Group */}
                            <BudgetFieldsGroup
                                budgetType={editForm.data.budget_type}
                                budgetCost={editForm.data.budget_cost}
                                budgetHours={editForm.data.budget_hours}
                                onBudgetTypeChange={(value) => editForm.setData('budget_type', value)}
                                onBudgetCostChange={(value) => editForm.setData('budget_cost', value)}
                                onBudgetHoursChange={(value) => editForm.setData('budget_hours', value)}
                                averageBillingRate={workOrder.averageBillingRate ?? 0}
                                errors={{
                                    budget_type: editForm.errors.budget_type,
                                    budget_cost: editForm.errors.budget_cost,
                                    budget_hours: editForm.errors.budget_hours,
                                }}
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={editForm.processing}>
                                Save
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Create Task Dialog */}
            <Dialog open={createTaskDialogOpen} onOpenChange={setCreateTaskDialogOpen}>
                <DialogContent>
                    <form onSubmit={handleCreateTask}>
                        <DialogHeader>
                            <DialogTitle>Create Task</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label>Title</Label>
                                <Input
                                    value={taskForm.data.title}
                                    onChange={(e) => taskForm.setData('title', e.target.value)}
                                    placeholder="Task title"
                                />
                                <InputError message={taskForm.errors.title} />
                            </div>
                            <div className="grid gap-2">
                                <Label>Assign To</Label>
                                <Select
                                    value={taskForm.data.assignedToId || 'unassigned'}
                                    onValueChange={(value) =>
                                        taskForm.setData('assignedToId', value === 'unassigned' ? '' : value)
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select assignee" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="unassigned">Unassigned</SelectItem>
                                        {teamMembers.map((member) => (
                                            <SelectItem key={member.id} value={member.id}>
                                                <span className="flex items-center gap-2">
                                                    <User className="h-3 w-3" />
                                                    {member.name}
                                                </span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label>Due Date</Label>
                                <Input
                                    type="date"
                                    value={taskForm.data.dueDate}
                                    onChange={(e) => taskForm.setData('dueDate', e.target.value)}
                                />
                                <div className="flex flex-wrap gap-1">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-6 text-xs"
                                        onClick={() => taskForm.setData('dueDate', getPresetDate('today'))}
                                    >
                                        Today
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-6 text-xs"
                                        onClick={() => taskForm.setData('dueDate', getPresetDate('tomorrow'))}
                                    >
                                        Tomorrow
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-6 text-xs"
                                        onClick={() => taskForm.setData('dueDate', getPresetDate('nextMonday'))}
                                    >
                                        Next Monday
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-6 text-xs"
                                        onClick={() => taskForm.setData('dueDate', getPresetDate('nextMonth'))}
                                    >
                                        Next Month
                                    </Button>
                                </div>
                                <InputError message={taskForm.errors.dueDate} />
                            </div>
                            <div className="grid gap-2">
                                <Label>Description</Label>
                                <Input
                                    value={taskForm.data.description}
                                    onChange={(e) => taskForm.setData('description', e.target.value)}
                                    placeholder="Brief description"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setCreateTaskDialogOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={taskForm.processing}>
                                Create
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Create Deliverable Dialog */}
            <Dialog open={createDeliverableDialogOpen} onOpenChange={setCreateDeliverableDialogOpen}>
                <DialogContent className="max-w-lg">
                    <form onSubmit={handleCreateDeliverable}>
                        <DialogHeader>
                            <DialogTitle>Add Deliverable</DialogTitle>
                            <DialogDescription>
                                Add a new deliverable to this work order
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid max-h-[60vh] gap-4 overflow-y-auto py-4">
                            <div className="grid gap-2">
                                <Label>Title *</Label>
                                <Input
                                    value={deliverableForm.data.title}
                                    onChange={(e) => deliverableForm.setData('title', e.target.value)}
                                    placeholder="Deliverable title"
                                />
                                <InputError message={deliverableForm.errors.title} />
                            </div>
                            <div className="grid gap-2">
                                <Label>Type *</Label>
                                <Select
                                    value={deliverableForm.data.type}
                                    onValueChange={(value) =>
                                        deliverableForm.setData('type', value as any)
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="document">Document</SelectItem>
                                        <SelectItem value="design">Design</SelectItem>
                                        <SelectItem value="report">Report</SelectItem>
                                        <SelectItem value="code">Code</SelectItem>
                                        <SelectItem value="other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label>Description</Label>
                                <Textarea
                                    value={deliverableForm.data.description}
                                    onChange={(e) =>
                                        deliverableForm.setData('description', e.target.value)
                                    }
                                    placeholder="Brief description of the deliverable"
                                    rows={3}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>File URL</Label>
                                <Input
                                    type="url"
                                    value={deliverableForm.data.fileUrl}
                                    onChange={(e) => deliverableForm.setData('fileUrl', e.target.value)}
                                    placeholder="https://..."
                                />
                                <InputError message={deliverableForm.errors.fileUrl} />
                            </div>

                            {/* Acceptance Criteria */}
                            <div className="grid gap-2">
                                <Label>Acceptance Criteria</Label>
                                <div className="flex gap-2">
                                    <Input
                                        value={newCriterion}
                                        onChange={(e) => setNewCriterion(e.target.value)}
                                        placeholder="Add acceptance criterion"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                addCriterion();
                                            }
                                        }}
                                    />
                                    <Button type="button" variant="outline" onClick={addCriterion}>
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>
                                {deliverableForm.data.acceptanceCriteria.length > 0 && (
                                    <ul className="mt-2 space-y-2">
                                        {deliverableForm.data.acceptanceCriteria.map((criterion, index) => (
                                            <li
                                                key={index}
                                                className="bg-muted flex items-center gap-2 rounded-md p-2 text-sm"
                                            >
                                                <CheckCircle2 className="text-muted-foreground h-4 w-4 shrink-0" />
                                                <span className="flex-1">{criterion}</span>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6"
                                                    onClick={() => removeCriterion(index)}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setCreateDeliverableDialogOpen(false);
                                    deliverableForm.reset();
                                    setNewCriterion('');
                                }}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={deliverableForm.processing}>
                                Add
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Deliverable Dialog */}
            <Dialog open={editDeliverableDialogOpen} onOpenChange={setEditDeliverableDialogOpen}>
                <DialogContent className="max-w-lg">
                    <form onSubmit={handleUpdateDeliverable}>
                        <DialogHeader>
                            <DialogTitle>Edit Deliverable</DialogTitle>
                        </DialogHeader>
                        <div className="grid max-h-[60vh] gap-4 overflow-y-auto py-4">
                            <div className="grid gap-2">
                                <Label>Title *</Label>
                                <Input
                                    value={editDeliverableForm.data.title}
                                    onChange={(e) => editDeliverableForm.setData('title', e.target.value)}
                                />
                                <InputError message={editDeliverableForm.errors.title} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label>Type</Label>
                                    <Select
                                        value={editDeliverableForm.data.type}
                                        onValueChange={(value) => editDeliverableForm.setData('type', value as any)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="document">Document</SelectItem>
                                            <SelectItem value="design">Design</SelectItem>
                                            <SelectItem value="report">Report</SelectItem>
                                            <SelectItem value="code">Code</SelectItem>
                                            <SelectItem value="other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label>Version</Label>
                                    <Input
                                        value={editDeliverableForm.data.version}
                                        onChange={(e) => editDeliverableForm.setData('version', e.target.value)}
                                        placeholder="1.0"
                                    />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label>Status</Label>
                                <Select
                                    value={editDeliverableForm.data.status}
                                    onValueChange={(value) => editDeliverableForm.setData('status', value as any)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="draft">Draft</SelectItem>
                                        <SelectItem value="in_review">In Review</SelectItem>
                                        <SelectItem value="approved">Approved</SelectItem>
                                        <SelectItem value="delivered">Delivered</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label>Description</Label>
                                <Textarea
                                    value={editDeliverableForm.data.description}
                                    onChange={(e) => editDeliverableForm.setData('description', e.target.value)}
                                    rows={3}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>File URL</Label>
                                <Input
                                    type="url"
                                    value={editDeliverableForm.data.fileUrl}
                                    onChange={(e) => editDeliverableForm.setData('fileUrl', e.target.value)}
                                    placeholder="https://..."
                                />
                            </div>

                            {/* Acceptance Criteria for Edit */}
                            <div className="grid gap-2">
                                <Label>Acceptance Criteria</Label>
                                <div className="flex gap-2">
                                    <Input
                                        value={editCriterion}
                                        onChange={(e) => setEditCriterion(e.target.value)}
                                        placeholder="Add acceptance criterion"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                addEditCriterion();
                                            }
                                        }}
                                    />
                                    <Button type="button" variant="outline" onClick={addEditCriterion}>
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>
                                {editDeliverableForm.data.acceptanceCriteria.length > 0 && (
                                    <ul className="mt-2 space-y-2">
                                        {editDeliverableForm.data.acceptanceCriteria.map((criterion, index) => (
                                            <li
                                                key={index}
                                                className="bg-muted flex items-center gap-2 rounded-md p-2 text-sm"
                                            >
                                                <CheckCircle2 className="text-muted-foreground h-4 w-4 shrink-0" />
                                                <span className="flex-1">{criterion}</span>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6"
                                                    onClick={() => removeEditCriterion(index)}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setEditDeliverableDialogOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={editDeliverableForm.processing}>
                                Save
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Deliverable Confirmation Dialog */}
            <Dialog open={deleteDeliverableDialogOpen} onOpenChange={setDeleteDeliverableDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Deliverable</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete "{selectedDeliverable?.title}"? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteDeliverableDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDeleteDeliverable}>
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Task Status Change Dialog */}
            <Dialog
                open={taskTransitionDialogOpen}
                onOpenChange={(open) => {
                    setTaskTransitionDialogOpen(open);
                    if (!open) {
                        setSelectedTask(null);
                        setSelectedTaskTransition(null);
                        setTaskTransitionError(null);
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Change Task Status</DialogTitle>
                        <DialogDescription>
                            Select a new status for "{selectedTask?.title}"
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <div className="grid gap-2">
                            <Label>New Status</Label>
                            <Select
                                value={selectedTaskTransition || ''}
                                onValueChange={(value) => {
                                    setSelectedTaskTransition(value);
                                    setTaskTransitionError(null);
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select status..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {selectedTask && getTaskStatusOptions(selectedTask.status).map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        {taskTransitionError && (
                            <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950">
                                <p className="text-sm text-red-800 dark:text-red-200">{taskTransitionError}</p>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setTaskTransitionDialogOpen(false);
                                setSelectedTask(null);
                                setSelectedTaskTransition(null);
                                setTaskTransitionError(null);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleTaskTransitionConfirm}
                            disabled={!selectedTaskTransition || isTaskTransitioning}
                        >
                            {isTaskTransitioning ? 'Updating...' : 'Update Status'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Task Delete Confirmation Dialog */}
            <Dialog open={taskDeleteDialogOpen} onOpenChange={setTaskDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Task</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete "{selectedTask?.title}"? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setTaskDeleteDialogOpen(false);
                                setSelectedTask(null);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleTaskDeleteConfirm}>
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Promote to Work Order Dialog */}
            {selectedTask && (
                <PromoteToWorkOrderDialog
                    open={taskPromoteDialogOpen}
                    onOpenChange={(open) => {
                        setTaskPromoteDialogOpen(open);
                        if (!open) setSelectedTask(null);
                    }}
                    taskId={selectedTask.id}
                    taskTitle={selectedTask.title}
                    taskDescription={selectedTask.description}
                    taskDueDate={selectedTask.dueDate}
                    taskEstimatedHours={selectedTask.estimatedHours}
                    taskAssignedToId={selectedTask.assignedToId}
                    taskChecklistItems={selectedTask.checklistItems}
                    teamMembers={teamMembers}
                />
            )}

            {/* Transition Error Display */}
            {transitionError && (
                <div className="fixed right-4 bottom-4 z-50 max-w-sm rounded-lg border border-red-200 bg-red-50 p-4 shadow-lg dark:border-red-800 dark:bg-red-950">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                        <p className="text-sm text-red-800 dark:text-red-200">{transitionError}</p>
                        <button
                            onClick={() => setTransitionError(null)}
                            className="ml-auto text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
                        >
                            &times;
                        </button>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}

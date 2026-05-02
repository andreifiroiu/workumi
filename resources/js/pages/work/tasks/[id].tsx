import { Head, Link, useForm, router } from '@inertiajs/react';
import {
    ArrowLeft,
    Calendar,
    Clock,
    User,
    Bot,
    MoreVertical,
    Edit,
    Trash2,
    Play,
    Pause,
    Plus,
    CheckCircle2,
    Circle,
    AlertTriangle,
    History,
    MessageSquare,
    ArrowUpCircle,
    Pencil,
    X,
    Check,
} from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
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
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import InputError from '@/components/input-error';
import { StatusBadge, ProgressBar } from '@/components/work';
import { HoursProgressIndicator } from '@/components/time-tracking';
import {
    TransitionButton,
    TransitionDialog,
    TransitionHistory,
    TimerConfirmationDialog,
    type TransitionOption,
    type StatusTransition,
} from '@/components/workflow';
import { CommunicationsPanel } from '@/components/communications';
import { PromoteToWorkOrderDialog } from '@/components/work/promote-to-work-order-dialog';
import { taskStatusLabels } from '@/components/ui/status-badge';
import { useState, useEffect, useCallback } from 'react';
import type { BreadcrumbItem } from '@/types';

/**
 * Extended Task type with additional workflow properties
 */
interface TaskWithWorkflow {
    id: string;
    title: string;
    description: string | null;
    workOrderId: string;
    workOrderTitle: string;
    projectId: string;
    projectName: string;
    assignedToId: string | null;
    assignedToName: string;
    assignedAgentId: string | null;
    assignedAgentName: string | null;
    status: string;
    dueDate: string | null;
    estimatedHours: number;
    actualHours: number;
    checklistItems: Array<{ id: string; text: string; completed: boolean }>;
    dependencies: string[];
    isBlocked: boolean;
}

/**
 * Time entry type for display
 */
interface TimeEntryDisplay {
    id: string;
    userId: string;
    userName: string;
    hours: number;
    date: string;
    mode: string;
    note: string | null;
    startedAt: string | null;
    stoppedAt: string | null;
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
 * Communication thread summary
 */
interface CommunicationThreadSummary {
    id: string;
    messageCount: number;
}

/**
 * Extended props with workflow features
 */
interface TaskDetailProps {
    task: TaskWithWorkflow;
    timeEntries: TimeEntryDisplay[];
    activeTimer: { id: string; startedAt: string } | null;
    teamMembers: Array<{ id: string; name: string }>;
    availableAgents?: Array<{ id: string; name: string }>;
    statusTransitions?: StatusTransition[];
    allowedTransitions?: TransitionOption[];
    rejectionFeedback?: RejectionFeedback | null;
    communicationThread?: CommunicationThreadSummary | null;
    siblingWorkOrders?: Array<{ id: string; title: string }>;
    siblingTasks?: Array<{ id: string; title: string }>;
}

export default function TaskDetail({
    task,
    timeEntries,
    activeTimer,
    teamMembers,
    availableAgents = [],
    statusTransitions = [],
    allowedTransitions = [],
    rejectionFeedback = null,
    communicationThread = null,
    siblingWorkOrders = [],
    siblingTasks = [],
}: TaskDetailProps) {
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [logTimeDialogOpen, setLogTimeDialogOpen] = useState(false);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [transitionDialogOpen, setTransitionDialogOpen] = useState(false);
    const [selectedTransition, setSelectedTransition] = useState<string | null>(null);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [transitionError, setTransitionError] = useState<string | null>(null);
    const [timerConfirmDialogOpen, setTimerConfirmDialogOpen] = useState(false);
    const [isStartingTimer, setIsStartingTimer] = useState(false);
    const [localStatus, setLocalStatus] = useState(task.status);
    const [localTransitions, setLocalTransitions] = useState(statusTransitions);
    const [localAllowedTransitions, setLocalAllowedTransitions] = useState(allowedTransitions);
    const [commsPanelOpen, setCommsPanelOpen] = useState(false);
    const [promoteDialogOpen, setPromoteDialogOpen] = useState(false);

    // Checklist management state
    const [isAddingChecklist, setIsAddingChecklist] = useState(false);
    const [newChecklistText, setNewChecklistText] = useState('');
    const [editingItemId, setEditingItemId] = useState<string | null>(null);
    const [editingItemText, setEditingItemText] = useState('');

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Work', href: '/work' },
        { title: task.projectName, href: `/work/projects/${task.projectId}` },
        {
            title: task.workOrderTitle,
            href: `/work/work-orders/${task.workOrderId}`,
            siblings: siblingWorkOrders.map((wo) => ({ title: wo.title, href: `/work/work-orders/${wo.id}` })),
        },
        {
            title: task.title,
            href: `/work/tasks/${task.id}`,
            siblings: siblingTasks.map((t) => ({ title: t.title, href: `/work/tasks/${t.id}` })),
        },
    ];

    // Determine the initial assignment value for the unified dropdown
    // Format: 'user:{id}', 'agent:{id}', or 'unassigned' for no assignment
    const getInitialAssignment = () => {
        if (task.assignedToId) return `user:${task.assignedToId}`;
        if (task.assignedAgentId) return `agent:${task.assignedAgentId}`;
        return 'unassigned';
    };

    const editForm = useForm({
        title: task.title,
        description: task.description || '',
        status: task.status,
        assignment: getInitialAssignment(),
        due_date: task.dueDate || '',
        estimated_hours: task.estimatedHours.toString(),
    });

    const timeForm = useForm({
        hours: '',
        date: new Date().toISOString().split('T')[0],
        note: '',
        taskId: task.id,
    });

    // Timer logic
    useEffect(() => {
        let interval: NodeJS.Timeout | null = null;
        if (activeTimer) {
            const startTime = new Date(activeTimer.startedAt).getTime();
            const updateElapsed = () => {
                const now = Date.now();
                setElapsedTime(Math.floor((now - startTime) / 1000));
            };
            updateElapsed();
            interval = setInterval(updateElapsed, 1000);
        } else {
            setElapsedTime(0);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [activeTimer]);

    // Sync local state with props
    useEffect(() => {
        setLocalStatus(task.status);
    }, [task.status]);

    useEffect(() => {
        setLocalTransitions(statusTransitions);
    }, [statusTransitions]);

    useEffect(() => {
        setLocalAllowedTransitions(allowedTransitions);
    }, [allowedTransitions]);

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const handleUpdateTask = (e: React.FormEvent) => {
        e.preventDefault();

        // Parse the unified assignment value into separate fields
        const assignment = editForm.data.assignment;
        let assignedToId: string | null = null;
        let assignedAgentId: string | null = null;

        if (assignment.startsWith('user:')) {
            assignedToId = assignment.replace('user:', '');
        } else if (assignment.startsWith('agent:')) {
            assignedAgentId = assignment.replace('agent:', '');
        }
        // 'unassigned' value means both should be null (already set above)

        // Manually construct the data to send
        router.patch(`/work/tasks/${task.id}`, {
            title: editForm.data.title,
            description: editForm.data.description,
            assignedToId,
            assignedAgentId,
            dueDate: editForm.data.due_date,
            estimatedHours: editForm.data.estimated_hours,
        }, {
            preserveScroll: true,
            onSuccess: () => setEditDialogOpen(false),
        });
    };

    /**
     * Handle quick assignment change from header dropdown
     */
    const handleAssignmentChange = (value: string) => {
        let assignedToId: string | null = null;
        let assignedAgentId: string | null = null;

        if (value.startsWith('user:')) {
            assignedToId = value.replace('user:', '');
        } else if (value.startsWith('agent:')) {
            assignedAgentId = value.replace('agent:', '');
        }

        router.patch(`/work/tasks/${task.id}`, {
            assignedToId,
            assignedAgentId,
        }, { preserveScroll: true });
    };

    const handleToggleChecklist = (itemId: string, completed: boolean) => {
        router.patch(`/work/tasks/${task.id}/checklist/${itemId}`, {
            completed: !completed,
        });
    };

    /**
     * Add a new checklist item
     */
    const handleAddChecklistItem = useCallback(() => {
        if (!newChecklistText.trim()) return;

        router.post(`/work/tasks/${task.id}/checklist`, {
            text: newChecklistText.trim(),
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setNewChecklistText('');
                setIsAddingChecklist(false);
            },
        });
    }, [task.id, newChecklistText]);

    /**
     * Start editing a checklist item
     */
    const handleStartEditItem = useCallback((itemId: string, currentText: string) => {
        setEditingItemId(itemId);
        setEditingItemText(currentText);
    }, []);

    /**
     * Save the edited checklist item
     */
    const handleSaveEditItem = useCallback(() => {
        if (!editingItemId || !editingItemText.trim()) return;

        router.patch(`/work/tasks/${task.id}/checklist/${editingItemId}/text`, {
            text: editingItemText.trim(),
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setEditingItemId(null);
                setEditingItemText('');
            },
        });
    }, [task.id, editingItemId, editingItemText]);

    /**
     * Cancel editing a checklist item
     */
    const handleCancelEditItem = useCallback(() => {
        setEditingItemId(null);
        setEditingItemText('');
    }, []);

    /**
     * Delete a checklist item
     */
    const handleDeleteChecklistItem = useCallback((itemId: string) => {
        router.delete(`/work/tasks/${task.id}/checklist/${itemId}`, {
            preserveScroll: true,
        });
    }, [task.id]);

    /**
     * Handle keyboard events for checklist input
     */
    const handleChecklistKeyDown = useCallback((e: React.KeyboardEvent, action: 'add' | 'edit') => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (action === 'add') {
                handleAddChecklistItem();
            } else {
                handleSaveEditItem();
            }
        } else if (e.key === 'Escape') {
            if (action === 'add') {
                setIsAddingChecklist(false);
                setNewChecklistText('');
            } else {
                handleCancelEditItem();
            }
        }
    }, [handleAddChecklistItem, handleSaveEditItem, handleCancelEditItem]);

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
                const response = await fetch(`/work/tasks/${task.id}/transition`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-CSRF-TOKEN':
                            document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
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
                setLocalStatus(data.task.status);
                if (data.task.statusTransitions) {
                    setLocalTransitions(
                        data.task.statusTransitions.map(
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
                updateAllowedTransitions(data.task.status);

                setTransitionDialogOpen(false);
                setSelectedTransition(null);

                // Reload page to get fresh data
                router.reload({ only: ['task', 'statusTransitions', 'allowedTransitions', 'rejectionFeedback'] });
            } catch (error) {
                setTransitionError('An error occurred while updating the status');
            } finally {
                setIsTransitioning(false);
            }
        },
        [selectedTransition, task.id]
    );

    /**
     * Update allowed transitions based on new status
     */
    const updateAllowedTransitions = useCallback((newStatus: string) => {
        const transitionMap: Record<string, TransitionOption[]> = {
            todo: [
                { value: 'in_progress', label: 'Start Working' },
                { value: 'cancelled', label: 'Cancel', destructive: true },
            ],
            in_progress: [
                { value: 'in_review', label: 'Submit for Review' },
                { value: 'done', label: 'Mark as Done' },
                { value: 'blocked', label: 'Mark as Blocked' },
                { value: 'cancelled', label: 'Cancel', destructive: true },
            ],
            in_review: [
                { value: 'approved', label: 'Approve' },
                { value: 'revision_requested', label: 'Request Changes' },
                { value: 'cancelled', label: 'Cancel', destructive: true },
            ],
            approved: [
                { value: 'done', label: 'Mark as Done' },
                { value: 'revision_requested', label: 'Request Changes' },
                { value: 'cancelled', label: 'Cancel', destructive: true },
            ],
            blocked: [
                { value: 'in_progress', label: 'Unblock' },
                { value: 'cancelled', label: 'Cancel', destructive: true },
            ],
            done: [],
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
     * Handle timer start with confirmation flow
     */
    const handleStartTimer = useCallback(async () => {
        setIsStartingTimer(true);

        try {
            const response = await fetch(`/work/tasks/${task.id}/timer/start`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN':
                        document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
            });

            const data = await response.json();

            if (data.confirmation_required) {
                setTimerConfirmDialogOpen(true);
            } else if (data.blocked) {
                // Timer is blocked for cancelled tasks
                alert(data.message);
            } else if (data.started) {
                // Timer started successfully
                router.reload();
            }
        } catch (error) {
            alert('Failed to start timer');
        } finally {
            setIsStartingTimer(false);
        }
    }, [task.id]);

    /**
     * Confirm timer start and transition status
     */
    const handleTimerConfirm = useCallback(async () => {
        setIsStartingTimer(true);

        try {
            const response = await fetch(`/work/tasks/${task.id}/timer/start?confirmed=true`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN':
                        document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
            });

            const data = await response.json();

            if (data.started) {
                setTimerConfirmDialogOpen(false);
                router.reload();
            } else {
                alert(data.message || 'Failed to start timer');
            }
        } catch (error) {
            alert('Failed to start timer');
        } finally {
            setIsStartingTimer(false);
        }
    }, [task.id]);

    const handleTimerConfirmCancel = useCallback(() => {
        setTimerConfirmDialogOpen(false);
    }, []);

    const handleStopTimer = () => {
        router.post(`/work/tasks/${task.id}/timer/stop`);
    };

    const handleLogTime = (e: React.FormEvent) => {
        e.preventDefault();
        timeForm.post('/work/time-entries', {
            preserveScroll: true,
            onSuccess: () => {
                timeForm.reset();
                setLogTimeDialogOpen(false);
            },
        });
    };

    const handleDelete = () => {
        if (confirm('Are you sure you want to delete this task?')) {
            router.delete(`/work/tasks/${task.id}`);
        }
    };

    const completedItems = task.checklistItems.filter((item) => item.completed).length;
    const totalItems = task.checklistItems.length;
    const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    const totalTimeLogged = timeEntries.reduce((sum, entry) => sum + entry.hours, 0);

    // Get the label for the selected transition
    const selectedTransitionLabel = selectedTransition
        ? taskStatusLabels[selectedTransition as keyof typeof taskStatusLabels] || selectedTransition
        : '';

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={task.title} />

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
                            <Link href={`/work/work-orders/${task.workOrderId}`}>
                                <ArrowLeft className="h-4 w-4" />
                            </Link>
                        </Button>
                        <div className="flex-1">
                            <div className="mb-1 flex items-center gap-3">
                                <h1 className="text-foreground text-2xl font-bold">{task.title}</h1>
                                <StatusBadge status={localStatus} type="task" />
                                {task.isBlocked && <Badge variant="destructive">Blocked</Badge>}
                            </div>
                            <p className="text-muted-foreground">
                                {task.workOrderTitle}
                                {task.description && ` - ${task.description}`}
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

                        {/* Assignment Selector */}
                        <Select
                            value={task.assignedAgentId ? `agent:${task.assignedAgentId}` :
                                   task.assignedToId ? `user:${task.assignedToId}` : 'unassigned'}
                            onValueChange={handleAssignmentChange}
                        >
                            <SelectTrigger className="w-[180px]">
                                <SelectValue>
                                    {task.assignedAgentId ? (
                                        <span className="flex items-center gap-2">
                                            <Bot className="h-3 w-3" />
                                            {task.assignedAgentName}
                                        </span>
                                    ) : task.assignedToId ? (
                                        <span className="flex items-center gap-2">
                                            <User className="h-3 w-3" />
                                            {task.assignedToName}
                                        </span>
                                    ) : (
                                        <span className="text-muted-foreground">Unassigned</span>
                                    )}
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="unassigned">Unassigned</SelectItem>
                                <SelectGroup>
                                    <SelectLabel>Team Members</SelectLabel>
                                    {teamMembers.map((m) => (
                                        <SelectItem key={`user:${m.id}`} value={`user:${m.id}`}>
                                            <span className="flex items-center gap-2">
                                                <User className="h-3 w-3" />
                                                {m.name}
                                            </span>
                                        </SelectItem>
                                    ))}
                                </SelectGroup>
                                {availableAgents.length > 0 && (
                                    <SelectGroup>
                                        <SelectLabel>AI Agents</SelectLabel>
                                        {availableAgents.map((agent) => (
                                            <SelectItem key={`agent:${agent.id}`} value={`agent:${agent.id}`}>
                                                <span className="flex items-center gap-2">
                                                    <Bot className="h-3 w-3" />
                                                    {agent.name}
                                                </span>
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                )}
                            </SelectContent>
                        </Select>

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
                                <DropdownMenuItem onClick={() => setPromoteDialogOpen(true)}>
                                    <ArrowUpCircle className="mr-2 h-4 w-4" />
                                    Promote to Work Order
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    {/* Task Stats */}
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
                        <div className="bg-muted flex items-center gap-3 rounded-lg p-3">
                            {task.assignedAgentId ? (
                                <Bot className="text-muted-foreground h-5 w-5" />
                            ) : (
                                <User className="text-muted-foreground h-5 w-5" />
                            )}
                            <div>
                                <div className="text-muted-foreground text-xs">Assigned To</div>
                                <div className="font-medium">
                                    {task.assignedAgentName || task.assignedToName || 'Unassigned'}
                                </div>
                            </div>
                        </div>
                        <div className="bg-muted flex items-center gap-3 rounded-lg p-3">
                            <Clock className="text-muted-foreground h-5 w-5" />
                            <div>
                                <div className="text-muted-foreground text-xs">Estimated</div>
                                <div className="font-medium">{task.estimatedHours}h</div>
                            </div>
                        </div>
                        <div className="bg-muted flex items-center gap-3 rounded-lg p-3">
                            <Clock className="text-muted-foreground h-5 w-5" />
                            <div>
                                <div className="text-muted-foreground text-xs">Logged</div>
                                <div className="font-medium">{totalTimeLogged.toFixed(1)}h</div>
                            </div>
                        </div>
                        <div className="bg-muted flex items-center gap-3 rounded-lg p-3">
                            <CheckCircle2 className="text-muted-foreground h-5 w-5" />
                            <div>
                                <div className="text-muted-foreground text-xs">Checklist</div>
                                <div className="font-medium">
                                    {completedItems}/{totalItems}
                                </div>
                            </div>
                        </div>
                        <div className="bg-muted flex items-center gap-3 rounded-lg p-3">
                            {(() => {
                                const taskDueDate = task.dueDate ? new Date(task.dueDate) : null;
                                const taskIsOverdue = taskDueDate ? taskDueDate < new Date() && task.status !== 'done' : false;
                                return (
                                    <>
                                        <Calendar className={`h-5 w-5 ${taskIsOverdue ? 'text-destructive' : 'text-muted-foreground'}`} />
                                        <div>
                                            <div className="text-muted-foreground text-xs">Due Date</div>
                                            <div className={`font-medium ${taskIsOverdue ? 'text-destructive' : ''}`}>
                                                {task.dueDate ? (
                                                    <>
                                                        {new Date(task.dueDate).toLocaleDateString()}
                                                        {taskIsOverdue && ' (overdue)'}
                                                    </>
                                                ) : 'Not set'}
                                            </div>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 overflow-auto p-6">
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                        {/* Timer & Time Tracking */}
                        <div>
                            <h2 className="text-foreground mb-4 text-lg font-bold">Time Tracking</h2>

                            {/* Hours Progress Indicator */}
                            <div className="bg-card border-border mb-4 rounded-xl border p-4">
                                <h3 className="text-foreground mb-3 text-sm font-medium">Actual vs Estimated</h3>
                                <HoursProgressIndicator
                                    actualHours={task.actualHours}
                                    estimatedHours={task.estimatedHours}
                                />
                            </div>

                            {/* Timer Widget */}
                            <div className="bg-card border-border mb-4 rounded-xl border p-6">
                                <div className="mb-4 text-center">
                                    <div className="text-foreground mb-2 font-mono text-4xl font-bold">
                                        {formatTime(elapsedTime)}
                                    </div>
                                    <p className="text-muted-foreground text-sm">
                                        {activeTimer ? 'Timer running...' : 'Timer stopped'}
                                    </p>
                                </div>
                                <div className="flex justify-center gap-2">
                                    {activeTimer ? (
                                        <Button onClick={handleStopTimer} variant="destructive">
                                            <Pause className="mr-2 h-4 w-4" />
                                            Stop Timer
                                        </Button>
                                    ) : (
                                        <Button onClick={handleStartTimer} disabled={isStartingTimer}>
                                            <Play className="mr-2 h-4 w-4" />
                                            {isStartingTimer ? 'Starting...' : 'Start Timer'}
                                        </Button>
                                    )}
                                    <Button variant="outline" onClick={() => setLogTimeDialogOpen(true)}>
                                        <Plus className="mr-2 h-4 w-4" />
                                        Log Time
                                    </Button>
                                </div>
                            </div>

                            {/* Time Entries */}
                            <div className="space-y-2">
                                <h3 className="text-foreground text-sm font-medium">Time Entries</h3>
                                {timeEntries.length === 0 ? (
                                    <p className="text-muted-foreground py-4 text-center text-sm">No time logged yet</p>
                                ) : (
                                    timeEntries.map((entry) => (
                                        <div
                                            key={entry.id}
                                            className="bg-muted flex items-center justify-between rounded-lg p-3"
                                        >
                                            <div>
                                                <div className="font-medium">{entry.hours}h</div>
                                                <div className="text-muted-foreground text-xs">
                                                    {entry.userName} - {new Date(entry.date).toLocaleDateString()} -{' '}
                                                    {entry.mode}
                                                </div>
                                            </div>
                                            {entry.note && (
                                                <p className="text-muted-foreground text-sm">{entry.note}</p>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Checklist */}
                        <div>
                            <div className="mb-4 flex items-center justify-between">
                                <h2 className="text-foreground text-lg font-bold">Checklist</h2>
                                {!isAddingChecklist && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setIsAddingChecklist(true)}
                                    >
                                        <Plus className="mr-1 h-3 w-3" />
                                        Add Item
                                    </Button>
                                )}
                            </div>

                            {totalItems > 0 && (
                                <div className="mb-4">
                                    <div className="mb-2 flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">Progress</span>
                                        <span className="font-medium">{progress}%</span>
                                    </div>
                                    <ProgressBar progress={progress} />
                                </div>
                            )}

                            {/* Add new item form */}
                            {isAddingChecklist && (
                                <div className="bg-card border-border mb-3 flex items-center gap-2 rounded-lg border p-3">
                                    <Input
                                        autoFocus
                                        value={newChecklistText}
                                        onChange={(e) => setNewChecklistText(e.target.value)}
                                        onKeyDown={(e) => handleChecklistKeyDown(e, 'add')}
                                        placeholder="Enter checklist item..."
                                        className="flex-1"
                                    />
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={handleAddChecklistItem}
                                        disabled={!newChecklistText.trim()}
                                    >
                                        <Check className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => {
                                            setIsAddingChecklist(false);
                                            setNewChecklistText('');
                                        }}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}

                            {totalItems === 0 && !isAddingChecklist ? (
                                <div className="bg-muted/50 rounded-xl py-8 text-center">
                                    <p className="text-muted-foreground mb-3">No checklist items</p>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setIsAddingChecklist(true)}
                                    >
                                        <Plus className="mr-1 h-3 w-3" />
                                        Add your first item
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {task.checklistItems.map((item) => (
                                        <div
                                            key={item.id}
                                            className="bg-card border-border group flex items-center gap-3 rounded-lg border p-3"
                                        >
                                            {editingItemId === item.id ? (
                                                <>
                                                    <Input
                                                        autoFocus
                                                        value={editingItemText}
                                                        onChange={(e) => setEditingItemText(e.target.value)}
                                                        onKeyDown={(e) => handleChecklistKeyDown(e, 'edit')}
                                                        className="flex-1"
                                                    />
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        onClick={handleSaveEditItem}
                                                        disabled={!editingItemText.trim()}
                                                    >
                                                        <Check className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        onClick={handleCancelEditItem}
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </>
                                            ) : (
                                                <>
                                                    <Checkbox
                                                        checked={item.completed}
                                                        onCheckedChange={() => handleToggleChecklist(item.id, item.completed)}
                                                    />
                                                    <span
                                                        className={`flex-1 ${item.completed ? 'text-muted-foreground line-through' : ''}`}
                                                    >
                                                        {item.text}
                                                    </span>
                                                    <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-7 w-7"
                                                            onClick={() => handleStartEditItem(item.id, item.text)}
                                                        >
                                                            <Pencil className="h-3 w-3" />
                                                        </Button>
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="text-destructive h-7 w-7"
                                                            onClick={() => handleDeleteChecklistItem(item.id)}
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Dependencies */}
                            {task.dependencies.length > 0 && (
                                <div className="mt-6">
                                    <h3 className="text-foreground mb-3 text-sm font-medium">Dependencies</h3>
                                    <div className="space-y-2">
                                        {task.dependencies.map((dep, i) => (
                                            <div
                                                key={i}
                                                className="bg-muted flex items-center gap-2 rounded-lg p-3 text-sm"
                                            >
                                                <Circle className="text-muted-foreground h-4 w-4" />
                                                <span>{dep}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Transition History */}
                        <div>
                            <div className="mb-4 flex items-center gap-2">
                                <History className="text-muted-foreground h-5 w-5" />
                                <h2 className="text-foreground text-lg font-bold">Activity</h2>
                            </div>
                            <div className="bg-card border-border rounded-xl border p-4">
                                <TransitionHistory transitions={localTransitions} variant="task" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Communications Panel */}
            <CommunicationsPanel
                threadableType="tasks"
                threadableId={task.id}
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

            {/* Timer Confirmation Dialog */}
            <TimerConfirmationDialog
                isOpen={timerConfirmDialogOpen}
                currentStatus={localStatus}
                onConfirm={handleTimerConfirm}
                onCancel={handleTimerConfirmCancel}
                isLoading={isStartingTimer}
            />

            {/* Edit Dialog */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent>
                    <form onSubmit={handleUpdateTask}>
                        <DialogHeader>
                            <DialogTitle>Edit Task</DialogTitle>
                            <VisuallyHidden>
                                <DialogDescription>Update task details including title, assignment, and due date</DialogDescription>
                            </VisuallyHidden>
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
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label>Assigned To</Label>
                                    <Select
                                        value={editForm.data.assignment}
                                        onValueChange={(v) => editForm.setData('assignment', v)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Unassigned" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="unassigned">
                                                <span className="text-muted-foreground">Unassigned</span>
                                            </SelectItem>
                                            <SelectGroup>
                                                <SelectLabel className="flex items-center gap-2">
                                                    <User className="h-3 w-3" />
                                                    Team Members
                                                </SelectLabel>
                                                {teamMembers.map((m) => (
                                                    <SelectItem key={`user:${m.id}`} value={`user:${m.id}`}>
                                                        <span className="flex items-center gap-2">
                                                            <User className="h-3 w-3" />
                                                            {m.name}
                                                        </span>
                                                    </SelectItem>
                                                ))}
                                            </SelectGroup>
                                            {availableAgents.length > 0 && (
                                                <SelectGroup>
                                                    <SelectLabel className="flex items-center gap-2">
                                                        <Bot className="h-3 w-3" />
                                                        AI Agents
                                                    </SelectLabel>
                                                    {availableAgents.map((agent) => (
                                                        <SelectItem key={`agent:${agent.id}`} value={`agent:${agent.id}`}>
                                                            <span className="flex items-center gap-2">
                                                                <Bot className="h-3 w-3" />
                                                                {agent.name}
                                                            </span>
                                                        </SelectItem>
                                                    ))}
                                                </SelectGroup>
                                            )}
                                        </SelectContent>
                                    </Select>
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
                                <Label>Due Date</Label>
                                <Input
                                    type="date"
                                    value={editForm.data.due_date}
                                    onChange={(e) => editForm.setData('due_date', e.target.value)}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>Description</Label>
                                <Input
                                    value={editForm.data.description}
                                    onChange={(e) => editForm.setData('description', e.target.value)}
                                />
                            </div>
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

            {/* Log Time Dialog */}
            <Dialog open={logTimeDialogOpen} onOpenChange={setLogTimeDialogOpen}>
                <DialogContent>
                    <form onSubmit={handleLogTime}>
                        <DialogHeader>
                            <DialogTitle>Log Time</DialogTitle>
                            <DialogDescription>Manually log time spent on this task</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label>Hours</Label>
                                    <Input
                                        type="number"
                                        step="0.25"
                                        value={timeForm.data.hours}
                                        onChange={(e) => timeForm.setData('hours', e.target.value)}
                                        placeholder="0.0"
                                    />
                                    <InputError message={timeForm.errors.hours} />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Date</Label>
                                    <Input
                                        type="date"
                                        value={timeForm.data.date}
                                        onChange={(e) => timeForm.setData('date', e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label>Note (optional)</Label>
                                <Input
                                    value={timeForm.data.note}
                                    onChange={(e) => timeForm.setData('note', e.target.value)}
                                    placeholder="What did you work on?"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setLogTimeDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={timeForm.processing}>
                                Log Time
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

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

            {/* Promote to Work Order Dialog */}
            <PromoteToWorkOrderDialog
                open={promoteDialogOpen}
                onOpenChange={setPromoteDialogOpen}
                taskId={task.id}
                taskTitle={task.title}
                taskDescription={task.description}
                taskDueDate={task.dueDate}
                taskEstimatedHours={task.estimatedHours}
                taskAssignedToId={task.assignedToId}
                taskChecklistItems={task.checklistItems}
                teamMembers={teamMembers}
            />
        </AppLayout>
    );
}

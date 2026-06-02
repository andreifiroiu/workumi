import { Head, Link, useForm, router } from '@inertiajs/react';
import {
    ArrowLeft,
    Calendar,
    Clock,
    User,
    MoreVertical,
    MessageSquare,
    Edit,
    Archive,
    Trash2,
    Lock,
    Unlock,
    DollarSign,
} from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { StatusBadge, ProgressBar, ProjectTeamSection, WorkOrderListSection } from '@/components/work';
import { CommunicationsPanel } from '@/components/communications';
import { BudgetFieldsGroup } from '@/components/budget';
import { ProjectInsightsPanel } from '@/components/pm-copilot';
import { DraftClientUpdateButton } from '@/components/client-comms';
import { useProjectInsights } from '@/hooks/use-pm-copilot';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { ProjectDocumentsSection } from './components/project-documents-section';
import { useState, useEffect } from 'react';
import type { ProjectDetailProps, BudgetType } from '@/types/work';
import type { BreadcrumbItem } from '@/types';
import type { FolderNode } from '@/components/documents/folder-tree';

interface ProjectDetailPageProps extends ProjectDetailProps {
    folders: FolderNode[];
    siblingProjects: Array<{ id: string; name: string }>;
}

/**
 * Formats a number as USD currency.
 */
function formatCurrency(value: number | null | undefined): string {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
}

export default function ProjectDetail({
    project,
    workOrderLists,
    ungroupedWorkOrders,
    documents,
    folders,
    communicationThread,
    parties,
    teamMembers,
    siblingProjects,
}: ProjectDetailPageProps) {
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [createWorkOrderDialogOpen, setCreateWorkOrderDialogOpen] = useState(false);
    const [, setSelectedListId] = useState<string | undefined>(undefined);
    const [commsPanelOpen, setCommsPanelOpen] = useState(false);
    const [bulkArchiveError, setBulkArchiveError] = useState<string | null>(null);
    const [insightsPanelOpen, setInsightsPanelOpen] = useState(true);

    // Project insights hook
    const { insights, isLoading: isLoadingInsights, fetch: fetchInsights } = useProjectInsights(project.id);

    // Fetch insights on mount
    useEffect(() => {
        fetchInsights();
    }, [fetchInsights]);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Work', href: '/work' },
        {
            title: project.name,
            href: `/work/projects/${project.id}`,
            siblings: siblingProjects.map((p) => ({ title: p.name, href: `/work/projects/${p.id}` })),
        },
    ];

    const editForm = useForm({
        name: project.name,
        description: project.description || '',
        party_id: project.partyId,
        status: project.status,
        target_end_date: project.targetEndDate || '',
        budget_hours: project.budgetHours?.toString() || '',
        budget_type: project.budgetType as BudgetType | undefined,
        budget_cost: project.budgetCost?.toString() || '',
    });

    const workOrderForm = useForm({
        title: '',
        projectId: project.id,
        description: '',
        priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
        dueDate: '',
        workOrderListId: undefined as string | undefined,
    });

    const handleUpdateProject = (e: React.FormEvent) => {
        e.preventDefault();
        editForm.patch(`/work/projects/${project.id}`, {
            preserveScroll: true,
            onSuccess: () => setEditDialogOpen(false),
        });
    };

    const handleOpenCreateWorkOrderDialog = (listId?: string) => {
        setSelectedListId(listId);
        workOrderForm.setData('workOrderListId', listId);
        setCreateWorkOrderDialogOpen(true);
    };

    const handleCreateWorkOrder = (e: React.FormEvent) => {
        e.preventDefault();
        workOrderForm.post('/work/work-orders', {
            preserveScroll: true,
            onSuccess: () => {
                workOrderForm.reset();
                setSelectedListId(undefined);
                setCreateWorkOrderDialogOpen(false);
            },
        });
    };

    const handleArchive = () => {
        router.post(`/work/projects/${project.id}/archive`);
    };

    const handleBulkArchiveDelivered = () => {
        router.post(`/work/projects/${project.id}/work-orders/bulk-archive-delivered`, {}, {
            preserveScroll: true,
            onError: (errors) => setBulkArchiveError(errors.tasks ?? 'Failed to archive delivered work orders.'),
        });
    };

    const handleTogglePrivacy = () => {
        router.patch(`/work/projects/${project.id}`, {
            isPrivate: !project.isPrivate,
        }, {
            preserveScroll: true,
        });
    };

    const handleDelete = () => {
        if (confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
            router.delete(`/work/projects/${project.id}`);
        }
    };

    // Determine budget display value based on budget type
    const getBudgetDisplayValue = () => {
        if (!project.budgetType) return null;

        if (project.budgetType === 'fixed_price' || project.budgetType === 'monthly_subscription') {
            return project.budgetCost ? formatCurrency(project.budgetCost) : 'Not set';
        }

        if (project.budgetType === 'time_and_materials') {
            const hours = project.budgetHours ?? 0;
            const rate = project.averageBillingRate ?? 0;
            const estimated = hours * rate;
            return estimated > 0 ? `~${formatCurrency(estimated)}` : 'Not set';
        }

        return null;
    };

    const budgetDisplayValue = getBudgetDisplayValue();

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={project.name} />

            <div className="flex h-full flex-1 flex-col">
                {/* Header */}
                <div className="px-6 py-6 border-b border-sidebar-border/70 dark:border-sidebar-border">
                    <div className="flex items-center gap-4 mb-4">
                        <Button variant="ghost" size="icon" asChild>
                            <Link href="/work">
                                <ArrowLeft className="h-4 w-4" />
                            </Link>
                        </Button>
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                                <h1 className="text-2xl font-bold text-foreground">{project.name}</h1>
                                {project.isPrivate && (
                                    <span title="Private project">
                                        <Lock className="h-4 w-4 text-muted-foreground" />
                                    </span>
                                )}
                                <StatusBadge status={project.status} type="project" />
                            </div>
                            {project.description && (
                                <p className="text-muted-foreground">{project.description}</p>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <DraftClientUpdateButton
                                entityType="project"
                                entityId={project.id}
                            />
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCommsPanelOpen(true)}
                            >
                                <MessageSquare className="h-4 w-4 mr-2" />
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
                                        <Edit className="h-4 w-4 mr-2" />
                                        Edit Project
                                    </DropdownMenuItem>
                                    {project.canTogglePrivacy && (
                                        <DropdownMenuItem onClick={handleTogglePrivacy}>
                                            {project.isPrivate ? (
                                                <>
                                                    <Unlock className="h-4 w-4 mr-2" />
                                                    Make Public
                                                </>
                                            ) : (
                                                <>
                                                    <Lock className="h-4 w-4 mr-2" />
                                                    Make Private
                                                </>
                                            )}
                                        </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem onClick={handleArchive}>
                                        <Archive className="h-4 w-4 mr-2" />
                                        Archive
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        onClick={handleDelete}
                                        className="text-destructive"
                                    >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>

                    {/* Project Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                            <User className="h-5 w-5 text-muted-foreground" />
                            <div>
                                <div className="text-xs text-muted-foreground">Client</div>
                                <div className="font-medium">{project.partyName}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                            <User className="h-5 w-5 text-muted-foreground" />
                            <div>
                                <div className="text-xs text-muted-foreground">Owner</div>
                                <div className="font-medium">{project.ownerName}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                            <Clock className="h-5 w-5 text-muted-foreground" />
                            <div>
                                <div className="text-xs text-muted-foreground">Hours</div>
                                <div className="font-medium">
                                    {project.actualHours}
                                    {project.budgetHours && ` / ${project.budgetHours}`}h
                                </div>
                            </div>
                        </div>
                        {budgetDisplayValue && (
                            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                                <DollarSign className="h-5 w-5 text-muted-foreground" />
                                <div>
                                    <div className="text-xs text-muted-foreground">Budget</div>
                                    <div className="font-medium">{budgetDisplayValue}</div>
                                </div>
                            </div>
                        )}
                        <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                            <Calendar className="h-5 w-5 text-muted-foreground" />
                            <div>
                                <div className="text-xs text-muted-foreground">Target Date</div>
                                <div className="font-medium">
                                    {project.targetEndDate
                                        ? new Date(project.targetEndDate).toLocaleDateString()
                                        : 'Not set'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Progress */}
                    <div className="mt-4">
                        <div className="flex items-center justify-between text-sm mb-2">
                            <span className="text-muted-foreground">Progress</span>
                            <span className="font-medium">{project.progress}%</span>
                        </div>
                        <ProgressBar progress={project.progress} />
                    </div>

                    {/* Project Insights Section */}
                    <div className="mt-6">
                        <Collapsible open={insightsPanelOpen} onOpenChange={setInsightsPanelOpen}>
                            <CollapsibleTrigger asChild>
                                <button
                                    type="button"
                                    className="flex w-full items-center justify-between py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                                >
                                    <span>AI Insights</span>
                                    <ChevronDown
                                        className={`h-4 w-4 transition-transform ${
                                            insightsPanelOpen ? 'rotate-180' : ''
                                        }`}
                                    />
                                </button>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                                <div className="mt-2">
                                    <ProjectInsightsPanel
                                        insights={insights}
                                        isLoading={isLoadingInsights}
                                    />
                                </div>
                            </CollapsibleContent>
                        </Collapsible>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 overflow-auto p-6">
                    {/* Team Members Section */}
                    <ProjectTeamSection
                        teamMembers={teamMembers}
                        projectId={project.id}
                    />

                    {/* Work Orders Section */}
                    <WorkOrderListSection
                        projectId={project.id}
                        projectName={project.name}
                        projectPartyId={project.partyId}
                        parties={parties}
                        workOrderLists={workOrderLists}
                        ungroupedWorkOrders={ungroupedWorkOrders}
                        onCreateWorkOrder={handleOpenCreateWorkOrderDialog}
                        onBulkArchiveDelivered={handleBulkArchiveDelivered}
                    />

                    {/* Documents Section */}
                    <ProjectDocumentsSection
                        projectId={project.id}
                        documents={documents}
                        folders={folders}
                    />
                </div>
            </div>

            {/* Communications Panel */}
            <CommunicationsPanel
                threadableType="projects"
                threadableId={project.id}
                open={commsPanelOpen}
                onOpenChange={setCommsPanelOpen}
            />

            {/* Edit Dialog */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    <form onSubmit={handleUpdateProject}>
                        <DialogHeader>
                            <DialogTitle>Edit Project</DialogTitle>
                            <DialogDescription>
                                Update project details
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label>Name</Label>
                                <Input
                                    value={editForm.data.name}
                                    onChange={(e) => editForm.setData('name', e.target.value)}
                                />
                                <InputError message={editForm.errors.name} />
                            </div>
                            <div className="grid gap-2">
                                <Label>Status</Label>
                                <Select
                                    value={editForm.data.status}
                                    onValueChange={(value) => editForm.setData('status', value as typeof project.status)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="on_hold">On Hold</SelectItem>
                                        <SelectItem value="completed">Completed</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label>Client</Label>
                                <Select
                                    value={editForm.data.party_id}
                                    onValueChange={(value) => editForm.setData('party_id', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {parties.map((p) => (
                                            <SelectItem key={p.id} value={p.id}>
                                                {p.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label>Description</Label>
                                <Input
                                    value={editForm.data.description}
                                    onChange={(e) => editForm.setData('description', e.target.value)}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>Target End Date</Label>
                                <Input
                                    type="date"
                                    value={editForm.data.target_end_date}
                                    onChange={(e) =>
                                        editForm.setData('target_end_date', e.target.value)
                                    }
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
                                averageBillingRate={project.averageBillingRate ?? 0}
                                errors={{
                                    budget_type: editForm.errors.budget_type,
                                    budget_cost: editForm.errors.budget_cost,
                                    budget_hours: editForm.errors.budget_hours,
                                }}
                            />
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setEditDialogOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={editForm.processing}>
                                Save Changes
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Create Work Order Dialog */}
            <Dialog open={createWorkOrderDialogOpen} onOpenChange={setCreateWorkOrderDialogOpen}>
                <DialogContent>
                    <form onSubmit={handleCreateWorkOrder}>
                        <DialogHeader>
                            <DialogTitle>Create Work Order</DialogTitle>
                            <DialogDescription>
                                Add a new work order to {project.name}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label>Title</Label>
                                <Input
                                    value={workOrderForm.data.title}
                                    onChange={(e) => workOrderForm.setData('title', e.target.value)}
                                    placeholder="Work order title"
                                />
                                <InputError message={workOrderForm.errors.title} />
                                <InputError message={workOrderForm.errors.projectId} />
                            </div>
                            <div className="grid gap-2">
                                <Label>Priority</Label>
                                <Select
                                    value={workOrderForm.data.priority}
                                    onValueChange={(value) =>
                                        workOrderForm.setData('priority', value as 'low' | 'medium' | 'high' | 'urgent')
                                    }
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
                            {workOrderLists.length > 0 && (
                                <div className="grid gap-2">
                                    <Label>List (optional)</Label>
                                    <Select
                                        value={workOrderForm.data.workOrderListId || 'none'}
                                        onValueChange={(value) =>
                                            workOrderForm.setData(
                                                'workOrderListId',
                                                value === 'none' ? undefined : value
                                            )
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a list" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">Ungrouped</SelectItem>
                                            {workOrderLists.map((list) => (
                                                <SelectItem key={list.id} value={list.id}>
                                                    <div className="flex items-center gap-2">
                                                        {list.color && (
                                                            <div
                                                                className="w-2 h-2 rounded-full"
                                                                style={{ backgroundColor: list.color }}
                                                            />
                                                        )}
                                                        {list.name}
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                            <div className="grid gap-2">
                                <Label>Description</Label>
                                <Input
                                    value={workOrderForm.data.description}
                                    onChange={(e) =>
                                        workOrderForm.setData('description', e.target.value)
                                    }
                                    placeholder="Brief description"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>Due Date</Label>
                                <Input
                                    type="date"
                                    value={workOrderForm.data.dueDate}
                                    onChange={(e) =>
                                        workOrderForm.setData('dueDate', e.target.value)
                                    }
                                />
                                <InputError message={workOrderForm.errors.dueDate} />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setCreateWorkOrderDialogOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={workOrderForm.processing}>
                                Create
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={bulkArchiveError !== null} onOpenChange={(open) => !open && setBulkArchiveError(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Cannot archive delivered work orders</DialogTitle>
                        <DialogDescription>{bulkArchiveError}</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button onClick={() => setBulkArchiveError(null)}>OK</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}

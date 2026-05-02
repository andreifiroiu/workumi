import { useState } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import { Lock, Search } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import InputError from '@/components/input-error';
import {
    ViewTabs,
    QuickAddBar,
    ProjectTreeItem,
    MyWorkView,
    KanbanView,
    CalendarView,
    ArchiveView,
} from '@/components/work';
import type { WorkPageProps, WorkView, QuickAddData, Project, Party } from '@/types/work';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Work', href: '/work' }];

export default function Work({
    projects,
    workOrders,
    tasks,
    deliverables,
    parties,
    teamMembers,
    communicationThreads,
    currentView,
    currentUserId,
    myWorkData,
    myWorkMetrics,
    myWorkSubtab,
    myWorkShowInformed,
}: WorkPageProps) {
    const [view, setView] = useState<WorkView>(currentView);
    const [searchQuery, setSearchQuery] = useState('');
    const [createProjectDialogOpen, setCreateProjectDialogOpen] = useState(false);
    const [createWorkOrderDialogOpen, setCreateWorkOrderDialogOpen] = useState(false);
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [createTaskDialogOpen, setCreateTaskDialogOpen] = useState(false);
    const [selectedWorkOrderId, setSelectedWorkOrderId] = useState<string | null>(null);

    const projectForm = useForm({
        name: '',
        partyId: '',
        startDate: new Date().toISOString().split('T')[0],
        description: '',
        isPrivate: false,
    });

    const workOrderForm = useForm({
        title: '',
        projectId: '',
        description: '',
        priority: 'medium' as const,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 week from now
    });

    const taskForm = useForm({
        title: '',
        workOrderId: '',
        description: '',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 week from now
    });

    const handleViewChange = (newView: WorkView) => {
        setView(newView);
        router.patch('/work/preferences', { key: 'work_view', value: newView }, { preserveState: true });
    };

    const handleQuickAdd = (data: QuickAddData) => {
        if (data.type === 'project') {
            projectForm.setData('name', data.title);
            setCreateProjectDialogOpen(true);
        }
    };

    const handleCreateWorkOrder = (projectId: string) => {
        setSelectedProjectId(projectId);
        workOrderForm.setData('projectId', projectId);
        setCreateWorkOrderDialogOpen(true);
    };

    const handleCreateTask = (workOrderId: string) => {
        setSelectedWorkOrderId(workOrderId);
        taskForm.setData('workOrderId', workOrderId);
        setCreateTaskDialogOpen(true);
    };

    const handleCreateWorkOrderFromKanban = (status: string) => {
        workOrderForm.reset();
        setCreateWorkOrderDialogOpen(true);
    };

    const handleCreateProject = (e: React.FormEvent) => {
        e.preventDefault();
        projectForm.post('/work/projects', {
            preserveScroll: true,
            onSuccess: () => {
                projectForm.reset();
                setCreateProjectDialogOpen(false);
            },
        });
    };

    const handleSubmitWorkOrder = (e: React.FormEvent) => {
        e.preventDefault();
        workOrderForm.post('/work/work-orders', {
            preserveScroll: true,
            onSuccess: () => {
                workOrderForm.reset();
                setCreateWorkOrderDialogOpen(false);
                setSelectedProjectId(null);
            },
        });
    };

    const handleSubmitTask = (e: React.FormEvent) => {
        e.preventDefault();
        taskForm.post('/work/tasks', {
            preserveScroll: true,
            onSuccess: () => {
                taskForm.reset();
                setCreateTaskDialogOpen(false);
                setSelectedWorkOrderId(null);
            },
        });
    };

    // Filter projects based on search
    const filteredProjects = searchQuery
        ? projects.filter(
              (p) =>
                  p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  (p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
          )
        : projects;

    const activeProjects = filteredProjects.filter((p) => p.status === 'active' || p.status === 'on_hold');

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Work" />

            <div className="flex h-full flex-1 flex-col">
                {/* Header */}
                <div className="px-6 py-6 border-b border-sidebar-border/70 dark:border-sidebar-border">
                    <h1 className="text-2xl font-bold text-foreground mb-2">Work</h1>
                    <p className="text-muted-foreground">
                        Manage projects, work orders, tasks, and deliverables
                    </p>
                </div>

                {/* View Tabs */}
                <ViewTabs currentView={view} onViewChange={handleViewChange} />

                {/* Main Content */}
                <div className="flex-1 overflow-auto">
                    {/* Search Bar (for relevant views) */}
                    {view === 'all_projects' && (
                        <div className="p-6 pb-0">
                            <div className="mb-6 flex items-center gap-4">
                                <div className="flex-1 relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search projects, work orders, tasks..."
                                        className="pl-10"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* All Projects View */}
                    {view === 'all_projects' && (
                        <div className="px-6 pb-6">
                            <div className="bg-card border border-border rounded-xl overflow-hidden">
                                <QuickAddBar onQuickAdd={handleQuickAdd} />

                                <div className="divide-y divide-border">
                                    {activeProjects.length === 0 ? (
                                        <div className="p-12 text-center">
                                            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                                                <Search className="w-8 h-8 text-muted-foreground" />
                                            </div>
                                            <h3 className="text-lg font-semibold text-foreground mb-2">
                                                {searchQuery ? 'No projects found' : 'No active projects'}
                                            </h3>
                                            <p className="text-sm text-muted-foreground mb-6">
                                                {searchQuery
                                                    ? 'Try adjusting your search query'
                                                    : 'Get started by creating your first project'}
                                            </p>
                                            {!searchQuery && (
                                                <Button onClick={() => setCreateProjectDialogOpen(true)}>
                                                    Create First Project
                                                </Button>
                                            )}
                                        </div>
                                    ) : (
                                        activeProjects.map((project) => (
                                            <ProjectTreeItem
                                                key={project.id}
                                                project={project}
                                                workOrders={workOrders}
                                                tasks={tasks}
                                                onCreateWorkOrder={handleCreateWorkOrder}
                                                onCreateTask={handleCreateTask}
                                            />
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* My Work View */}
                    {view === 'my_work' && (
                        <MyWorkView
                            workOrders={workOrders}
                            tasks={tasks}
                            currentUserId={currentUserId}
                            myWorkData={myWorkData}
                            myWorkMetrics={myWorkMetrics}
                            myWorkSubtab={myWorkSubtab}
                            myWorkShowInformed={myWorkShowInformed}
                        />
                    )}

                    {/* By Status (Kanban) View */}
                    {view === 'by_status' && (
                        <div className="p-6">
                            <KanbanView
                                workOrders={workOrders}
                                tasks={tasks}
                                onCreateWorkOrder={handleCreateWorkOrderFromKanban}
                            />
                        </div>
                    )}

                    {/* Calendar View */}
                    {view === 'calendar' && (
                        <div className="p-6">
                            <CalendarView projects={projects} workOrders={workOrders} />
                        </div>
                    )}

                    {/* Archive View */}
                    {view === 'archive' && (
                        <div className="p-6">
                            <ArchiveView projects={projects} workOrders={workOrders} tasks={tasks} />
                        </div>
                    )}
                </div>
            </div>

            {/* Create Project Dialog */}
            <Dialog open={createProjectDialogOpen} onOpenChange={setCreateProjectDialogOpen}>
                <DialogContent>
                    <form onSubmit={handleCreateProject}>
                        <DialogHeader>
                            <DialogTitle>Create New Project</DialogTitle>
                            <DialogDescription>
                                Create a new project to organize your work orders and tasks.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="project-name">Project Name</Label>
                                <Input
                                    id="project-name"
                                    value={projectForm.data.name}
                                    onChange={(e) => projectForm.setData('name', e.target.value)}
                                    placeholder="My Project"
                                />
                                <InputError message={projectForm.errors.name} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="project-party">Client / Party</Label>
                                <Select
                                    value={projectForm.data.partyId}
                                    onValueChange={(value) => projectForm.setData('partyId', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a party" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {parties.map((party) => (
                                            <SelectItem key={party.id} value={party.id}>
                                                {party.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <InputError message={projectForm.errors.partyId} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="project-start-date">Start Date</Label>
                                <Input
                                    id="project-start-date"
                                    type="date"
                                    value={projectForm.data.startDate}
                                    onChange={(e) => projectForm.setData('startDate', e.target.value)}
                                />
                                <InputError message={projectForm.errors.startDate} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="project-description">Description (optional)</Label>
                                <Input
                                    id="project-description"
                                    value={projectForm.data.description}
                                    onChange={(e) => projectForm.setData('description', e.target.value)}
                                    placeholder="Brief description of the project"
                                />
                                <InputError message={projectForm.errors.description} />
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label htmlFor="project-private">Private Project</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Only you and assigned team members can see this project
                                    </p>
                                </div>
                                <Switch
                                    id="project-private"
                                    checked={projectForm.data.isPrivate}
                                    onCheckedChange={(checked) => projectForm.setData('isPrivate', checked)}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setCreateProjectDialogOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={projectForm.processing}>
                                Create Project
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Create Work Order Dialog */}
            <Dialog open={createWorkOrderDialogOpen} onOpenChange={setCreateWorkOrderDialogOpen}>
                <DialogContent>
                    <form onSubmit={handleSubmitWorkOrder}>
                        <DialogHeader>
                            <DialogTitle>Create Work Order</DialogTitle>
                            <DialogDescription>
                                Create a new work order to track specific deliverables.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="wo-title">Title</Label>
                                <Input
                                    id="wo-title"
                                    value={workOrderForm.data.title}
                                    onChange={(e) => workOrderForm.setData('title', e.target.value)}
                                    placeholder="Work order title"
                                />
                                <InputError message={workOrderForm.errors.title} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="wo-project">Project</Label>
                                <Select
                                    value={workOrderForm.data.projectId}
                                    onValueChange={(value) => workOrderForm.setData('projectId', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a project" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {projects
                                            .filter((p) => p.status === 'active' || p.status === 'on_hold')
                                            .map((project) => (
                                                <SelectItem key={project.id} value={project.id}>
                                                    {project.name}
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                                <InputError message={workOrderForm.errors.projectId} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="wo-priority">Priority</Label>
                                <Select
                                    value={workOrderForm.data.priority}
                                    onValueChange={(value) =>
                                        workOrderForm.setData('priority', value as any)
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
                                <InputError message={workOrderForm.errors.priority} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="wo-due-date">Due Date</Label>
                                <Input
                                    id="wo-due-date"
                                    type="date"
                                    value={workOrderForm.data.dueDate}
                                    onChange={(e) => workOrderForm.setData('dueDate', e.target.value)}
                                />
                                <InputError message={workOrderForm.errors.dueDate} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="wo-description">Description (optional)</Label>
                                <Input
                                    id="wo-description"
                                    value={workOrderForm.data.description}
                                    onChange={(e) => workOrderForm.setData('description', e.target.value)}
                                    placeholder="Brief description"
                                />
                                <InputError message={workOrderForm.errors.description} />
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
                                Create Work Order
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Create Task Dialog */}
            <Dialog open={createTaskDialogOpen} onOpenChange={setCreateTaskDialogOpen}>
                <DialogContent>
                    <form onSubmit={handleSubmitTask}>
                        <DialogHeader>
                            <DialogTitle>Create Task</DialogTitle>
                            <DialogDescription>
                                Create a new task for tracking individual action items.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="task-title">Title</Label>
                                <Input
                                    id="task-title"
                                    value={taskForm.data.title}
                                    onChange={(e) => taskForm.setData('title', e.target.value)}
                                    placeholder="Task title"
                                />
                                <InputError message={taskForm.errors.title} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="task-wo">Work Order</Label>
                                <Select
                                    value={taskForm.data.workOrderId}
                                    onValueChange={(value) => taskForm.setData('workOrderId', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a work order" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {workOrders
                                            .filter((wo) => wo.status !== 'delivered')
                                            .map((wo) => (
                                                <SelectItem key={wo.id} value={wo.id}>
                                                    {wo.title}
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                                <InputError message={taskForm.errors.workOrderId} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="task-due-date">Due Date</Label>
                                <Input
                                    id="task-due-date"
                                    type="date"
                                    value={taskForm.data.dueDate}
                                    onChange={(e) => taskForm.setData('dueDate', e.target.value)}
                                />
                                <InputError message={taskForm.errors.dueDate} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="task-description">Description (optional)</Label>
                                <Input
                                    id="task-description"
                                    value={taskForm.data.description}
                                    onChange={(e) => taskForm.setData('description', e.target.value)}
                                    placeholder="Brief description"
                                />
                                <InputError message={taskForm.errors.description} />
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
                                Create Task
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}

import { useState, useCallback, useMemo } from 'react';
import { router } from '@inertiajs/react';
import { CheckCircle } from 'lucide-react';
import { MyWorkMetrics, metricFilterToRaciRole } from './my-work-metrics';
import { MyWorkSubtabs } from './my-work-subtabs';
import { MyWorkFilters, getDefaultFilters } from './my-work-filters';
import { MyWorkTasksList } from './my-work-tasks-list';
import { MyWorkOrdersList } from './my-work-orders-list';
import { MyWorkProjectsList } from './my-work-projects-list';
import { MyWorkTreeView } from './my-work-tree-view';
import type {
    WorkOrder,
    Task,
    MyWorkSubtab,
    MyWorkFiltersState,
    MyWorkMetrics as MyWorkMetricsType,
    MyWorkData,
    MyWorkTreeData,
    MyWorkTreeProject,
} from '@/types/work';

interface MyWorkViewProps {
    workOrders: WorkOrder[];
    tasks: Task[];
    currentUserId: string;
    myWorkData?: MyWorkData;
    myWorkMetrics?: MyWorkMetricsType;
    myWorkSubtab?: MyWorkSubtab;
    myWorkShowInformed?: boolean;
    onShowInformedChange?: (show: boolean) => void;
}

export function MyWorkView({
    workOrders,
    tasks,
    currentUserId,
    myWorkData,
    myWorkMetrics,
    myWorkSubtab = 'tasks',
    myWorkShowInformed = false,
    onShowInformedChange,
}: MyWorkViewProps) {
    const [activeSubtab, setActiveSubtab] = useState<MyWorkSubtab>(myWorkSubtab);
    const [filters, setFilters] = useState<MyWorkFiltersState>(getDefaultFilters());
    const [showInformed, setShowInformed] = useState(myWorkShowInformed);

    // Fall back to legacy filtering if myWorkData is not provided
    const projectsWithRoles = useMemo(() => {
        return myWorkData?.projects ?? [];
    }, [myWorkData?.projects]);

    const workOrdersWithRoles = useMemo(() => {
        return myWorkData?.workOrders ?? [];
    }, [myWorkData?.workOrders]);

    const userTasks = useMemo(() => {
        return myWorkData?.tasks ?? tasks.filter((t) => t.assignedToId === currentUserId);
    }, [myWorkData?.tasks, tasks, currentUserId]);

    // Default metrics when not provided from backend
    const metrics: MyWorkMetricsType = useMemo(() => {
        if (myWorkMetrics) {
            return myWorkMetrics;
        }

        // Calculate metrics from local data as fallback
        const myWorkOrders = workOrders.filter((wo) => wo.assignedToId === currentUserId);
        const myTasks = tasks.filter((t) => t.assignedToId === currentUserId);
        const inReviewWorkOrders = myWorkOrders.filter((wo) => wo.status === 'in_review');

        return {
            accountableCount: 0,
            responsibleCount: 0,
            awaitingReviewCount: inReviewWorkOrders.length,
            assignedTasksCount: myTasks.filter((t) => t.status !== 'done').length,
        };
    }, [myWorkMetrics, workOrders, tasks, currentUserId]);

    // Build tree data for the "All" subtab
    const treeData: MyWorkTreeData = useMemo(() => {
        const projectMap = new Map<string, MyWorkTreeProject>();

        // Add projects
        for (const project of projectsWithRoles) {
            projectMap.set(project.id, {
                id: project.id,
                name: project.name,
                status: project.status,
                partyName: project.partyName,
                progress: project.progress,
                userRaciRoles: project.userRaciRoles ?? [],
                workOrders: [],
            });
        }

        // Add work orders to their projects
        for (const wo of workOrdersWithRoles) {
            const project = projectMap.get(wo.projectId);
            if (project) {
                project.workOrders.push({
                    id: wo.id,
                    title: wo.title,
                    status: wo.status,
                    priority: wo.priority,
                    dueDate: wo.dueDate,
                    userRaciRoles: wo.userRaciRoles ?? [],
                    tasks: [],
                });
            }
        }

        // Add tasks to their work orders
        for (const task of userTasks) {
            const project = projectMap.get(task.projectId);
            if (project) {
                const workOrder = project.workOrders.find((wo) => wo.id === task.workOrderId);
                if (workOrder) {
                    workOrder.tasks.push({
                        id: task.id,
                        title: task.title,
                        status: task.status,
                        dueDate: task.dueDate,
                        assignedToName: task.assignedToName,
                    });
                }
            }
        }

        return {
            projects: Array.from(projectMap.values()).filter(
                (p) => p.workOrders.length > 0 || p.userRaciRoles.length > 0
            ),
        };
    }, [projectsWithRoles, workOrdersWithRoles, userTasks]);

    const handleSubtabChange = useCallback((subtab: MyWorkSubtab) => {
        setActiveSubtab(subtab);
        // Persist subtab preference
        router.patch(
            '/work/preferences',
            { key: 'my_work_subtab', value: subtab },
            { preserveState: true, preserveScroll: true }
        );
    }, []);

    const handleFiltersChange = useCallback((newFilters: MyWorkFiltersState) => {
        setFilters(newFilters);
    }, []);

    const handleShowInformedChange = useCallback(
        (show: boolean) => {
            setShowInformed(show);
            // Persist show informed preference
            router.patch(
                '/work/preferences',
                { key: 'my_work_show_informed', value: String(show) },
                { preserveState: true, preserveScroll: true }
            );
            // Call external handler if provided
            onShowInformedChange?.(show);
        },
        [onShowInformedChange]
    );

    const handleMetricClick = useCallback(
        (filterType: 'accountable' | 'responsible' | 'awaiting_review' | 'assigned_tasks') => {
            if (filterType === 'assigned_tasks') {
                // Switch to tasks subtab
                setActiveSubtab('tasks');
                router.patch(
                    '/work/preferences',
                    { key: 'my_work_subtab', value: 'tasks' },
                    { preserveState: true, preserveScroll: true }
                );
                // Clear filters to show all assigned tasks
                setFilters(getDefaultFilters());
            } else if (filterType === 'awaiting_review') {
                // Switch to work orders subtab and filter by in_review status
                setActiveSubtab('work_orders');
                router.patch(
                    '/work/preferences',
                    { key: 'my_work_subtab', value: 'work_orders' },
                    { preserveState: true, preserveScroll: true }
                );
                setFilters({
                    ...getDefaultFilters(),
                    statuses: ['in_review'],
                });
            } else {
                // Apply RACI role filter
                const role = metricFilterToRaciRole(filterType);
                if (role) {
                    // Switch to work orders subtab
                    setActiveSubtab('work_orders');
                    router.patch(
                        '/work/preferences',
                        { key: 'my_work_subtab', value: 'work_orders' },
                        { preserveState: true, preserveScroll: true }
                    );
                    setFilters({
                        ...getDefaultFilters(),
                        raciRoles: [role],
                    });
                }
            }
        },
        []
    );

    // Check if we have any work to show
    const hasNoWork = useMemo(() => {
        return (
            projectsWithRoles.length === 0 &&
            workOrdersWithRoles.length === 0 &&
            userTasks.length === 0
        );
    }, [projectsWithRoles, workOrdersWithRoles, userTasks]);

    return (
        <div className="space-y-0">
            {/* Summary Metrics Section */}
            <div className="px-4 py-4 sm:px-6">
                <MyWorkMetrics
                    metrics={metrics}
                    onMetricClick={handleMetricClick}
                    className="mb-0"
                />
            </div>

            {/* Subtab Navigation */}
            <MyWorkSubtabs
                activeTab={activeSubtab}
                onTabChange={handleSubtabChange}
            />

            {/* Filter Bar */}
            <MyWorkFilters
                filters={filters}
                showInformed={showInformed}
                activeSubtab={activeSubtab}
                onFiltersChange={handleFiltersChange}
                onShowInformedChange={handleShowInformedChange}
                className="flex-wrap md:flex-nowrap"
            />

            {/* Content Area */}
            <div className="p-4 sm:p-6">
                {hasNoWork ? (
                    <EmptyState />
                ) : (
                    <>
                        {/* Tasks Subtab */}
                        {activeSubtab === 'tasks' && (
                            <MyWorkTasksList
                                tasks={userTasks}
                                filters={filters}
                            />
                        )}

                        {/* Work Orders Subtab */}
                        {activeSubtab === 'work_orders' && (
                            <MyWorkOrdersList
                                workOrders={workOrdersWithRoles}
                                filters={filters}
                                showInformed={showInformed}
                            />
                        )}

                        {/* Projects Subtab */}
                        {activeSubtab === 'projects' && (
                            <MyWorkProjectsList
                                projects={projectsWithRoles}
                                filters={filters}
                                showInformed={showInformed}
                            />
                        )}

                        {/* All Subtab (Tree View) */}
                        {activeSubtab === 'all' && (
                            <MyWorkTreeView data={treeData} />
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

function EmptyState() {
    return (
        <div className="bg-card border border-border rounded-xl p-8 sm:p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">All caught up!</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
                You don't have any projects, work orders, or tasks assigned to you right now.
                When work items are assigned to you or you have RACI roles, they will appear here.
            </p>
        </div>
    );
}

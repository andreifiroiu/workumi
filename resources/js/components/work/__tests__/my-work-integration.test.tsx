import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MyWorkView } from '../my-work-view';
import type {
    WorkOrder,
    Task,
    Project,
    RaciRole,
    MyWorkMetrics,
    MyWorkData,
} from '@/types/work';

// Mock Inertia router - must be defined before vi.mock
vi.mock('@inertiajs/react', () => ({
    Link: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
        <a href={href} {...props}>{children}</a>
    ),
    router: {
        post: vi.fn(),
    },
}));

// Import the mocked router after mocking
import { router } from '@inertiajs/react';

describe('My Work Integration Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const mockProjects: Array<Project & { userRaciRoles: RaciRole[] }> = [
        {
            id: 'project-1',
            name: 'Project Accountable',
            description: 'Test project where user is accountable',
            partyId: 'party-1',
            partyName: 'Test Client',
            ownerId: 'user-2',
            ownerName: 'Owner User',
            status: 'active',
            startDate: '2024-01-01',
            targetEndDate: '2024-12-31',
            budgetHours: 100,
            actualHours: 25,
            progress: 25,
            tags: [],
            workOrderLists: [],
            ungroupedWorkOrders: [],
            userRaciRoles: ['accountable'],
        },
        {
            id: 'project-2',
            name: 'Project Informed Only',
            description: 'Test project where user is only informed',
            partyId: 'party-1',
            partyName: 'Test Client',
            ownerId: 'user-2',
            ownerName: 'Owner User',
            status: 'active',
            startDate: '2024-01-01',
            targetEndDate: '2024-12-31',
            budgetHours: 50,
            actualHours: 10,
            progress: 20,
            tags: [],
            workOrderLists: [],
            ungroupedWorkOrders: [],
            userRaciRoles: ['informed'],
        },
    ];

    const mockWorkOrders: Array<WorkOrder & { userRaciRoles: RaciRole[] }> = [
        {
            id: 'wo-1',
            title: 'Work Order Accountable',
            description: 'Test work order where user is accountable',
            projectId: 'project-1',
            projectName: 'Project Accountable',
            assignedToId: 'user-1',
            assignedToName: 'Test User',
            status: 'active',
            priority: 'high',
            dueDate: '2024-03-15',
            estimatedHours: 20,
            actualHours: 5,
            acceptanceCriteria: [],
            sopAttached: false,
            sopName: null,
            partyContactId: null,
            createdBy: 'user-2',
            createdByName: 'Other User',
            userRaciRoles: ['accountable'],
        },
        {
            id: 'wo-2',
            title: 'Work Order Responsible',
            description: 'Test work order where user is responsible',
            projectId: 'project-1',
            projectName: 'Project Accountable',
            assignedToId: 'user-1',
            assignedToName: 'Test User',
            status: 'in_review',
            priority: 'medium',
            dueDate: '2024-03-20',
            estimatedHours: 15,
            actualHours: 10,
            acceptanceCriteria: [],
            sopAttached: false,
            sopName: null,
            partyContactId: null,
            createdBy: 'user-2',
            createdByName: 'Other User',
            userRaciRoles: ['responsible'],
        },
        {
            id: 'wo-3',
            title: 'Work Order Informed',
            description: 'Test work order where user is only informed',
            projectId: 'project-2',
            projectName: 'Project Informed Only',
            assignedToId: 'user-2',
            assignedToName: 'Other User',
            status: 'draft',
            priority: 'low',
            dueDate: '2024-04-01',
            estimatedHours: 10,
            actualHours: 0,
            acceptanceCriteria: [],
            sopAttached: false,
            sopName: null,
            partyContactId: null,
            createdBy: 'user-2',
            createdByName: 'Other User',
            userRaciRoles: ['informed'],
        },
    ];

    const mockTasks: Task[] = [
        {
            id: 'task-1',
            title: 'Task In Progress',
            description: 'Test task in progress',
            workOrderId: 'wo-1',
            workOrderTitle: 'Work Order Accountable',
            projectId: 'project-1',
            assignedToId: 'user-1',
            assignedToName: 'Test User',
            assignedAgentId: null,
            assignedAgentName: null,
            status: 'in_progress',
            dueDate: '2024-03-10',
            estimatedHours: 5,
            actualHours: 2,
            checklistItems: [],
            dependencies: [],
            isBlocked: false,
        },
        {
            id: 'task-2',
            title: 'Task To Do',
            description: 'Test task to do',
            workOrderId: 'wo-2',
            workOrderTitle: 'Work Order Responsible',
            projectId: 'project-1',
            assignedToId: 'user-1',
            assignedToName: 'Test User',
            assignedAgentId: null,
            assignedAgentName: null,
            status: 'todo',
            dueDate: '2024-03-12',
            estimatedHours: 3,
            actualHours: 0,
            checklistItems: [],
            dependencies: [],
            isBlocked: false,
        },
    ];

    const mockMetrics: MyWorkMetrics = {
        accountableCount: 2,
        responsibleCount: 1,
        awaitingReviewCount: 1,
        assignedTasksCount: 2,
    };

    const mockMyWorkData: MyWorkData = {
        projects: mockProjects,
        workOrders: mockWorkOrders,
        tasks: mockTasks,
    };

    describe('Full My Work flow with subtab navigation', () => {
        it('renders tasks subtab by default and allows switching between subtabs', () => {
            render(
                <MyWorkView
                    workOrders={mockWorkOrders}
                    tasks={mockTasks}
                    currentUserId="user-1"
                    myWorkData={mockMyWorkData}
                    myWorkMetrics={mockMetrics}
                    myWorkSubtab="tasks"
                    myWorkShowInformed={false}
                />
            );

            // Should show tasks subtab as active by default
            const tasksTab = screen.getByRole('tab', { name: /tasks/i });
            expect(tasksTab).toHaveAttribute('data-state', 'active');

            // Should show task content
            expect(screen.getByText('Task In Progress')).toBeInTheDocument();
            expect(screen.getByText('Task To Do')).toBeInTheDocument();

            // Switch to work orders subtab
            const workOrdersTab = screen.getByRole('tab', { name: /work orders/i });
            fireEvent.click(workOrdersTab);

            // Should show work orders content
            expect(screen.getByText('Work Order Accountable')).toBeInTheDocument();
            expect(screen.getByText('Work Order Responsible')).toBeInTheDocument();
        });

        it('navigates to projects subtab and displays projects with RACI badges', () => {
            render(
                <MyWorkView
                    workOrders={mockWorkOrders}
                    tasks={mockTasks}
                    currentUserId="user-1"
                    myWorkData={mockMyWorkData}
                    myWorkMetrics={mockMetrics}
                    myWorkSubtab="projects"
                    myWorkShowInformed={false}
                />
            );

            // Should show projects subtab as active
            const projectsTab = screen.getByRole('tab', { name: /projects/i });
            expect(projectsTab).toHaveAttribute('data-state', 'active');

            // Should show projects content (excluding informed-only by default)
            expect(screen.getByText('Project Accountable')).toBeInTheDocument();
        });

        it('navigates to All subtab and displays tree view', () => {
            render(
                <MyWorkView
                    workOrders={mockWorkOrders}
                    tasks={mockTasks}
                    currentUserId="user-1"
                    myWorkData={mockMyWorkData}
                    myWorkMetrics={mockMetrics}
                    myWorkSubtab="all"
                    myWorkShowInformed={false}
                />
            );

            // Should show all subtab as active
            const allTab = screen.getByRole('tab', { name: /all/i });
            expect(allTab).toHaveAttribute('data-state', 'active');

            // Should show hierarchical tree view content
            expect(screen.getByText('Project Accountable')).toBeInTheDocument();
        });
    });

    describe('Filter and sort combination behavior', () => {
        it('applies status filter correctly to work orders', () => {
            render(
                <MyWorkView
                    workOrders={mockWorkOrders}
                    tasks={mockTasks}
                    currentUserId="user-1"
                    myWorkData={mockMyWorkData}
                    myWorkMetrics={mockMetrics}
                    myWorkSubtab="work_orders"
                    myWorkShowInformed={false}
                />
            );

            // Click on Active status filter badge (within the filter bar area)
            // Find the status filter section and click the Active badge within it
            const activeStatusBadges = screen.getAllByText('Active');
            // The filter badge should be a clickable badge element with data-slot="badge"
            const filterBadge = activeStatusBadges.find(el => el.getAttribute('data-slot') === 'badge');
            if (filterBadge) {
                fireEvent.click(filterBadge);
            }

            // Should show only active work orders
            expect(screen.getByText('Work Order Accountable')).toBeInTheDocument();
            // In Review should not be visible when filtered to Active only
            expect(screen.queryByText('Work Order Responsible')).not.toBeInTheDocument();
        });

        it('combines RACI role filter with status filter', () => {
            render(
                <MyWorkView
                    workOrders={mockWorkOrders}
                    tasks={mockTasks}
                    currentUserId="user-1"
                    myWorkData={mockMyWorkData}
                    myWorkMetrics={mockMetrics}
                    myWorkSubtab="work_orders"
                    myWorkShowInformed={false}
                />
            );

            // Click on Accountable role filter button - now uses aria-label
            const accountableBtn = screen.getByRole('button', { name: /filter by accountable/i });
            fireEvent.click(accountableBtn);

            // Should show only work orders where user is accountable
            expect(screen.getByText('Work Order Accountable')).toBeInTheDocument();
            expect(screen.queryByText('Work Order Responsible')).not.toBeInTheDocument();
        });
    });

    describe('Show Informed toggle persists and applies', () => {
        it('hides informed items by default and shows them when toggle is enabled', () => {
            const { rerender } = render(
                <MyWorkView
                    workOrders={mockWorkOrders}
                    tasks={mockTasks}
                    currentUserId="user-1"
                    myWorkData={mockMyWorkData}
                    myWorkMetrics={mockMetrics}
                    myWorkSubtab="work_orders"
                    myWorkShowInformed={false}
                />
            );

            // Informed work order should not be visible by default
            expect(screen.queryByText('Work Order Informed')).not.toBeInTheDocument();

            // Toggle the show informed switch
            const toggle = screen.getByRole('switch');
            fireEvent.click(toggle);

            // Rerender with showInformed = true to simulate state update
            rerender(
                <MyWorkView
                    workOrders={mockWorkOrders}
                    tasks={mockTasks}
                    currentUserId="user-1"
                    myWorkData={mockMyWorkData}
                    myWorkMetrics={mockMetrics}
                    myWorkSubtab="work_orders"
                    myWorkShowInformed={true}
                />
            );

            // Informed work order should now be visible
            expect(screen.getByText('Work Order Informed')).toBeInTheDocument();
        });

        it('persists show informed toggle via preference update', () => {
            render(
                <MyWorkView
                    workOrders={mockWorkOrders}
                    tasks={mockTasks}
                    currentUserId="user-1"
                    myWorkData={mockMyWorkData}
                    myWorkMetrics={mockMetrics}
                    myWorkSubtab="work_orders"
                    myWorkShowInformed={false}
                />
            );

            // Toggle the show informed switch
            const toggle = screen.getByRole('switch');
            fireEvent.click(toggle);

            // Should have called the preference update via router.patch
            expect(router.patch).toHaveBeenCalledWith(
                '/work/preferences',
                expect.objectContaining({ key: 'my_work_show_informed', value: 'true' }),
                expect.objectContaining({ preserveState: true, preserveScroll: true })
            );
        });
    });

    describe('Metric click-to-filter behavior', () => {
        it('clicking Accountable metric switches to work_orders subtab and applies filter', () => {
            render(
                <MyWorkView
                    workOrders={mockWorkOrders}
                    tasks={mockTasks}
                    currentUserId="user-1"
                    myWorkData={mockMyWorkData}
                    myWorkMetrics={mockMetrics}
                    myWorkSubtab="tasks"
                    myWorkShowInformed={false}
                />
            );

            // Click on the Accountable metric card - find by "items where you're accountable" text
            const accountableDescription = screen.getByText("items where you're accountable");
            const accountableMetric = accountableDescription.closest('button');
            if (accountableMetric) {
                fireEvent.click(accountableMetric);
            }

            // Should switch to work orders subtab
            const workOrdersTab = screen.getByRole('tab', { name: /work orders/i });
            expect(workOrdersTab).toHaveAttribute('data-state', 'active');
        });

        it('clicking Assigned Tasks metric switches to tasks subtab', () => {
            render(
                <MyWorkView
                    workOrders={mockWorkOrders}
                    tasks={mockTasks}
                    currentUserId="user-1"
                    myWorkData={mockMyWorkData}
                    myWorkMetrics={mockMetrics}
                    myWorkSubtab="work_orders"
                    myWorkShowInformed={false}
                />
            );

            // Click on the Assigned Tasks metric card - find by description text
            const tasksDescription = screen.getByText('tasks assigned to you');
            const tasksMetric = tasksDescription.closest('button');
            if (tasksMetric) {
                fireEvent.click(tasksMetric);
            }

            // Should switch to tasks subtab and show task content
            const tasksTab = screen.getByRole('tab', { name: /tasks/i });
            expect(tasksTab).toHaveAttribute('data-state', 'active');
        });

        it('clicking Awaiting Review metric switches to work_orders subtab with in_review filter', () => {
            render(
                <MyWorkView
                    workOrders={mockWorkOrders}
                    tasks={mockTasks}
                    currentUserId="user-1"
                    myWorkData={mockMyWorkData}
                    myWorkMetrics={mockMetrics}
                    myWorkSubtab="tasks"
                    myWorkShowInformed={false}
                />
            );

            // Click on the Awaiting Review metric card - find by description text
            const reviewDescription = screen.getByText('items awaiting your review');
            const awaitingReviewMetric = reviewDescription.closest('button');
            if (awaitingReviewMetric) {
                fireEvent.click(awaitingReviewMetric);
            }

            // Should switch to work orders subtab
            const workOrdersTab = screen.getByRole('tab', { name: /work orders/i });
            expect(workOrdersTab).toHaveAttribute('data-state', 'active');

            // Should show in_review work order
            expect(screen.getByText('Work Order Responsible')).toBeInTheDocument();
        });
    });

    describe('Subtab preference persistence', () => {
        it('persists subtab selection via router.post', () => {
            render(
                <MyWorkView
                    workOrders={mockWorkOrders}
                    tasks={mockTasks}
                    currentUserId="user-1"
                    myWorkData={mockMyWorkData}
                    myWorkMetrics={mockMetrics}
                    myWorkSubtab="tasks"
                    myWorkShowInformed={false}
                />
            );

            // Click on projects subtab
            const projectsTab = screen.getByRole('tab', { name: /projects/i });
            fireEvent.click(projectsTab);

            // Should have called preference update
            expect(router.patch).toHaveBeenCalledWith(
                '/work/preferences',
                expect.objectContaining({ key: 'my_work_subtab', value: 'projects' }),
                expect.objectContaining({ preserveState: true, preserveScroll: true })
            );
        });
    });
});

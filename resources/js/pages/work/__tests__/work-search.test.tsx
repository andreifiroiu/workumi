import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, afterEach } from 'vitest';

vi.mock('@inertiajs/react', () => ({
    Head: ({ title }: { title: string }) => <title>{title}</title>,
    router: {
        patch: vi.fn(),
        post: vi.fn(),
    },
    useForm: () => ({
        data: {},
        setData: vi.fn(),
        post: vi.fn(),
        processing: false,
        errors: {},
        reset: vi.fn(),
    }),
}));

vi.mock('@/layouts/app-layout', () => ({
    default: ({ children }: { children: React.ReactNode }) => <div data-testid="app-layout">{children}</div>,
}));

interface MockProject {
    id: string;
    name: string;
    workOrderLists: Array<{ name: string; workOrders: Array<{ id: string; title: string }> }>;
    ungroupedWorkOrders: Array<{ id: string; title: string }>;
}

vi.mock('@/components/work', () => ({
    ViewTabs: () => <div data-testid="view-tabs" />,
    QuickAddBar: () => <div data-testid="quick-add" />,
    ProjectTreeItem: ({
        project,
        tasks,
        forceExpand,
    }: {
        project: MockProject;
        tasks: Array<{ id: string; title: string }>;
        forceExpand?: boolean;
    }) => {
        const workOrderTitles = [
            ...project.workOrderLists.flatMap((list) => list.workOrders),
            ...project.ungroupedWorkOrders,
        ].map((wo) => wo.title);

        return (
            <div data-testid="project-item" data-force-expand={forceExpand ? 'true' : 'false'}>
                <span data-testid="project-name">{project.name}</span>
                {project.workOrderLists.map((list) => (
                    <span key={list.name} data-testid="list-name">
                        {list.name}
                    </span>
                ))}
                {workOrderTitles.map((title) => (
                    <span key={title} data-testid="work-order-title">
                        {title}
                    </span>
                ))}
                {tasks.map((task) => (
                    <span key={task.id} data-testid="task-title">
                        {task.title}
                    </span>
                ))}
            </div>
        );
    },
    MyWorkView: () => <div data-testid="my-work" />,
    KanbanView: () => <div data-testid="kanban" />,
    CalendarView: () => <div data-testid="calendar" />,
    ArchiveView: () => <div data-testid="archive" />,
}));

import Work from '../index';

function makeProject(overrides: Record<string, unknown> = {}) {
    return {
        id: 'proj-1',
        name: 'Acme Project',
        description: null,
        partyId: 'party-1',
        partyName: 'Acme',
        ownerId: 'user-1',
        ownerName: 'Owner',
        status: 'active',
        startDate: '2026-01-01',
        targetEndDate: null,
        budgetHours: null,
        budgetType: null,
        budgetCost: null,
        actualHours: 0,
        actualCost: null,
        actualRevenue: null,
        progress: 0,
        tags: [],
        workOrderLists: [],
        ungroupedWorkOrders: [],
        ...overrides,
    };
}

const baseProps = {
    workOrders: [],
    tasks: [],
    deliverables: [],
    parties: [],
    teamMembers: [],
    communicationThreads: [],
    currentView: 'all_projects' as const,
    currentUserId: 'user-1',
};

function renderWork(props: Record<string, unknown>) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return render(<Work {...(baseProps as any)} {...(props as any)} />);
}

function search(term: string) {
    const input = screen.getByPlaceholderText(/search projects/i);
    fireEvent.change(input, { target: { value: term } });
}

function visibleProjects() {
    return screen.queryAllByTestId('project-name').map((el) => el.textContent);
}

function visibleWorkOrders() {
    return screen.queryAllByTestId('work-order-title').map((el) => el.textContent);
}

function visibleTasks() {
    return screen.queryAllByTestId('task-title').map((el) => el.textContent);
}

function visibleLists() {
    return screen.queryAllByTestId('list-name').map((el) => el.textContent);
}

function workOrderInList(id: string, title: string) {
    return { id, title, status: 'active', priority: 'medium', dueDate: null, assignedToName: '', tasksCount: 0, completedTasksCount: 0, positionInList: 0 };
}

describe('Work page universal search', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it('matches by project name', () => {
        renderWork({ projects: [makeProject({ id: 'a', name: 'Marketing Site' }), makeProject({ id: 'b', name: 'Mobile App' })] });

        search('marketing');

        expect(visibleProjects()).toEqual(['Marketing Site']);
    });

    it('matches a project by a work order list name', () => {
        renderWork({
            projects: [
                makeProject({
                    id: 'a',
                    name: 'Acme Project',
                    workOrderLists: [{ id: 'l1', name: 'Onboarding Sprint', description: null, color: null, position: 0, workOrders: [] }],
                }),
                makeProject({ id: 'b', name: 'Other Project' }),
            ],
        });

        search('onboarding');

        expect(visibleProjects()).toEqual(['Acme Project']);
    });

    it('matches a project by a work order title inside a list', () => {
        renderWork({
            projects: [
                makeProject({
                    id: 'a',
                    name: 'Acme Project',
                    workOrderLists: [
                        {
                            id: 'l1',
                            name: 'List',
                            description: null,
                            color: null,
                            position: 0,
                            workOrders: [
                                { id: 'wo1', title: 'Build login screen', status: 'active', priority: 'medium', dueDate: null, assignedToName: '', tasksCount: 0, completedTasksCount: 0, positionInList: 0 },
                            ],
                        },
                    ],
                }),
                makeProject({ id: 'b', name: 'Other Project' }),
            ],
        });

        search('login screen');

        expect(visibleProjects()).toEqual(['Acme Project']);
    });

    it('matches a project by an ungrouped work order title', () => {
        renderWork({
            projects: [
                makeProject({
                    id: 'a',
                    name: 'Acme Project',
                    ungroupedWorkOrders: [
                        { id: 'wo1', title: 'Quarterly audit', status: 'active', priority: 'medium', dueDate: null, assignedToName: '', tasksCount: 0, completedTasksCount: 0, positionInList: 0 },
                    ],
                }),
                makeProject({ id: 'b', name: 'Other Project' }),
            ],
        });

        search('audit');

        expect(visibleProjects()).toEqual(['Acme Project']);
    });

    it('matches a project via a work order description from the top-level work orders array', () => {
        renderWork({
            projects: [
                makeProject({ id: 'a', name: 'Acme Project' }),
                makeProject({ id: 'b', name: 'Other Project', ungroupedWorkOrders: [workOrderInList('wo1', 'Redesign')] }),
            ],
            // The displayed node only carries a title; the description lives in the top-level array.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            workOrders: [{ id: 'wo1', title: 'Redesign', description: 'database migration work', projectId: 'b' } as any],
        });

        search('migration');

        expect(visibleProjects()).toEqual(['Other Project']);
        expect(visibleWorkOrders()).toEqual(['Redesign']);
    });

    it('matches a project via a task title', () => {
        renderWork({
            projects: [
                makeProject({ id: 'a', name: 'Acme Project', ungroupedWorkOrders: [workOrderInList('wo1', 'Some work')] }),
                makeProject({ id: 'b', name: 'Other Project' }),
            ],
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            tasks: [{ id: 't1', title: 'Write release notes', description: null, projectId: 'a', workOrderId: 'wo1' } as any],
        });

        search('release notes');

        expect(visibleProjects()).toEqual(['Acme Project']);
        expect(visibleTasks()).toEqual(['Write release notes']);
    });

    it('shows all projects when the query is empty', () => {
        renderWork({ projects: [makeProject({ id: 'a', name: 'Acme Project' }), makeProject({ id: 'b', name: 'Other Project' })] });

        expect(visibleProjects()).toEqual(['Acme Project', 'Other Project']);
    });

    it('prunes to only the matching work order while keeping the parent project and list', () => {
        renderWork({
            projects: [
                makeProject({
                    id: 'a',
                    name: 'Acme Project',
                    workOrderLists: [
                        {
                            id: 'l1',
                            name: 'Backend',
                            description: null,
                            color: null,
                            position: 0,
                            workOrders: [workOrderInList('wo1', 'Build login screen'), workOrderInList('wo2', 'Set up billing')],
                        },
                    ],
                }),
            ],
        });

        search('login');

        // Parent project and list remain, but only the matching work order shows.
        expect(visibleProjects()).toEqual(['Acme Project']);
        expect(visibleLists()).toEqual(['Backend']);
        expect(visibleWorkOrders()).toEqual(['Build login screen']);
    });

    it('keeps a whole list (all its work orders) when the list name matches', () => {
        renderWork({
            projects: [
                makeProject({
                    id: 'a',
                    name: 'Acme Project',
                    workOrderLists: [
                        {
                            id: 'l1',
                            name: 'Onboarding',
                            description: null,
                            color: null,
                            position: 0,
                            workOrders: [workOrderInList('wo1', 'First task'), workOrderInList('wo2', 'Second task')],
                        },
                    ],
                }),
            ],
        });

        search('onboarding');

        expect(visibleWorkOrders()).toEqual(['First task', 'Second task']);
    });

    it('prunes to only the matching task and keeps its parent work order', () => {
        renderWork({
            projects: [
                makeProject({
                    id: 'a',
                    name: 'Acme Project',
                    ungroupedWorkOrders: [workOrderInList('wo1', 'Release work'), workOrderInList('wo2', 'Other work')],
                }),
            ],
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            tasks: [
                { id: 't1', title: 'Write release notes', description: null, projectId: 'a', workOrderId: 'wo1' },
                { id: 't2', title: 'Unrelated task', description: null, projectId: 'a', workOrderId: 'wo1' },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ] as any,
        });

        search('release notes');

        // The matching task's work order is kept; the sibling work order is pruned.
        expect(visibleWorkOrders()).toEqual(['Release work']);
        expect(visibleTasks()).toEqual(['Write release notes']);
    });

    it('shows all tasks of a work order when the work order itself matches', () => {
        renderWork({
            projects: [
                makeProject({
                    id: 'a',
                    name: 'Acme Project',
                    ungroupedWorkOrders: [workOrderInList('wo1', 'Migration work')],
                }),
            ],
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            tasks: [
                { id: 't1', title: 'Step one', description: null, projectId: 'a', workOrderId: 'wo1' },
                { id: 't2', title: 'Step two', description: null, projectId: 'a', workOrderId: 'wo1' },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ] as any,
        });

        search('migration');

        expect(visibleWorkOrders()).toEqual(['Migration work']);
        expect(visibleTasks()).toEqual(['Step one', 'Step two']);
    });

    it('force-expands the tree while searching', () => {
        renderWork({ projects: [makeProject({ id: 'a', name: 'Acme Project' })] });

        search('acme');

        expect(screen.getByTestId('project-item')).toHaveAttribute('data-force-expand', 'true');
    });
});

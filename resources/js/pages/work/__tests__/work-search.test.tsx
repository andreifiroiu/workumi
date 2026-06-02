import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import type { Task, WorkOrder, WorkPageProps } from '@/types/work';

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

vi.mock('@/components/work', () => ({
    ViewTabs: () => <div data-testid="view-tabs" />,
    QuickAddBar: () => <div data-testid="quick-add" />,
    ProjectTreeItem: ({ project }: { project: { id: string; name: string } }) => (
        <div data-testid="project-item">{project.name}</div>
    ),
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

function makeWorkOrder(overrides: Partial<WorkOrder> = {}): WorkOrder {
    return {
        id: 'wo-1',
        title: 'Work Order',
        description: null,
        projectId: 'proj-1',
        projectName: 'Acme',
        assignedToId: null,
        assignedToName: '',
        status: 'active',
        priority: 'medium',
        dueDate: null,
        estimatedHours: 0,
        actualHours: 0,
        budgetType: null,
        budgetCost: null,
        budgetHours: null,
        actualCost: null,
        actualRevenue: null,
        acceptanceCriteria: [],
        sopAttached: false,
        sopName: null,
        partyContactId: null,
        createdBy: 'user-1',
        createdByName: 'Owner',
        ...overrides,
    };
}

function makeTask(overrides: Partial<Task> = {}): Task {
    return {
        id: 't-1',
        title: 'Task',
        description: null,
        workOrderId: 'wo-1',
        workOrderTitle: 'Work Order',
        projectId: 'proj-1',
        projectName: 'Acme',
        assignedToId: null,
        assignedToName: '',
        assignedAgentId: null,
        assignedAgentName: null,
        status: 'todo',
        dueDate: null,
        estimatedHours: 0,
        actualHours: 0,
        checklistItems: [],
        dependencies: [],
        isBlocked: false,
        ...overrides,
    };
}

const baseProps: WorkPageProps = {
    projects: [],
    workOrders: [],
    tasks: [],
    deliverables: [],
    parties: [],
    teamMembers: [],
    communicationThreads: [],
    currentView: 'all_projects',
    currentUserId: 'user-1',
};

function renderWork(props: Partial<WorkPageProps>) {
    return render(<Work {...baseProps} {...props} />);
}

function search(term: string) {
    const input = screen.getByPlaceholderText(/search projects/i);
    fireEvent.change(input, { target: { value: term } });
}

function visibleProjects() {
    return screen.queryAllByTestId('project-item').map((el) => el.textContent);
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

    it('matches a project via the top-level work orders array (title and description)', () => {
        renderWork({
            projects: [makeProject({ id: 'a', name: 'Acme Project' }), makeProject({ id: 'b', name: 'Other Project' })],
            workOrders: [makeWorkOrder({ id: 'wo1', title: 'Redesign', description: 'database migration work', projectId: 'b' })],
        });

        search('migration');

        expect(visibleProjects()).toEqual(['Other Project']);
    });

    it('matches a project via a task title', () => {
        renderWork({
            projects: [makeProject({ id: 'a', name: 'Acme Project' }), makeProject({ id: 'b', name: 'Other Project' })],
            tasks: [makeTask({ id: 't1', title: 'Write release notes', description: null, projectId: 'a' })],
        });

        search('release notes');

        expect(visibleProjects()).toEqual(['Acme Project']);
    });

    it('shows all projects when the query is empty', () => {
        renderWork({ projects: [makeProject({ id: 'a', name: 'Acme Project' }), makeProject({ id: 'b', name: 'Other Project' })] });

        expect(visibleProjects()).toEqual(['Acme Project', 'Other Project']);
    });
});

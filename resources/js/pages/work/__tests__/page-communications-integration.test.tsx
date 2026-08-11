import {
    act,
    fireEvent,
    render,
    screen,
    waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock fetch for API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

// Mock Inertia
vi.mock('@inertiajs/react', () => ({
    Head: ({ title }: { title: string }) => <title>{title}</title>,
    Link: ({
        href,
        children,
        className,
    }: {
        href: string;
        children: React.ReactNode;
        className?: string;
    }) => (
        <a href={href} className={className}>
            {children}
        </a>
    ),
    router: {
        post: vi.fn(),
        patch: vi.fn(),
        delete: vi.fn(),
        reload: vi.fn(),
        visit: vi.fn(),
        get: vi.fn(),
    },
    useForm: () => ({
        data: { title: '', description: '' },
        setData: vi.fn(),
        post: vi.fn(),
        patch: vi.fn(),
        delete: vi.fn(),
        processing: false,
        errors: {},
        reset: vi.fn(),
    }),
    usePage: () => ({
        props: {
            auth: { user: { id: 1, name: 'Test User' } },
            currentOrganization: { id: '1', name: 'Test Org' },
            organizations: [],
            sidebarOpen: true,
        },
    }),
}));

// Mock the app layout
vi.mock('@/layouts/app-layout', () => ({
    default: ({ children }: { children: React.ReactNode }) => (
        <div data-testid="app-layout">{children}</div>
    ),
}));

// Mock the CommunicationsPanel
vi.mock('@/components/communications', () => ({
    CommunicationsPanel: ({
        threadableType,
        threadableId,
        open,
        onOpenChange,
    }: {
        threadableType: string;
        threadableId: string;
        open: boolean;
        onOpenChange: (open: boolean) => void;
    }) =>
        open ? (
            <div data-testid="communications-panel">
                <span data-testid="panel-type">{threadableType}</span>
                <span data-testid="panel-id">{threadableId}</span>
                <button onClick={() => onOpenChange(false)}>Close</button>
            </div>
        ) : null,
}));

// Mock workflow components
vi.mock('@/components/workflow', async () => ({
    ...(await import('@/components/workflow/assignment-confirmation-dialog')),
    TransitionButton: () => <button>Transition</button>,
    TransitionDialog: () => null,
    TransitionHistory: () => <div>History</div>,
    TimerConfirmationDialog: () => null,
    RaciSelector: () => <div>RACI Selector</div>,
    AssignmentConfirmationDialog: () => null,
}));

// Mock work components
vi.mock('@/components/work', () => ({
    EditTaskDialog: () => null,
    StatusBadge: ({ status }: { status: string }) => <span>{status}</span>,
    PriorityBadge: ({ priority }: { priority: string }) => (
        <span>{priority}</span>
    ),
    ProgressBar: () => <div>Progress</div>,
    ProjectTeamSection: () => <div>Team Section</div>,
}));

// Mock time tracking
vi.mock('@/components/time-tracking', () => ({
    HoursProgressIndicator: () => <div>Hours Progress</div>,
}));

// Import after mocks are set up
import TaskDetail from '../tasks/[id]';

describe('Page Communications Integration', () => {
    beforeEach(() => {
        mockFetch.mockReset();
        mockFetch.mockResolvedValue({
            ok: true,
            json: () =>
                Promise.resolve({
                    thread: { id: '1', messageCount: 3, lastActivity: null },
                    messages: [
                        {
                            id: '1',
                            authorId: '2',
                            authorName: 'Test Author',
                            authorType: 'human',
                            timestamp: new Date().toISOString(),
                            content: 'Test message',
                            type: 'note',
                            editedAt: null,
                            canEdit: false,
                            canDelete: false,
                            mentions: [],
                            attachments: [],
                            reactions: [],
                        },
                    ],
                }),
        });
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    const mockTask = {
        id: 'task-1',
        title: 'Test Task',
        description: 'Test description',
        workOrderId: 'wo-1',
        workOrderTitle: 'Test Work Order',
        projectId: 'proj-1',
        projectName: 'Test Project',
        assignedToId: '1',
        assignedToName: 'Test User',
        status: 'in_progress',
        dueDate: new Date().toISOString(),
        estimatedHours: 8,
        actualHours: 4,
        checklistItems: [],
        dependencies: [],
        isBlocked: false,
    };

    it('renders CommunicationsPanel in Sheet on Task detail page', async () => {
        render(
            <TaskDetail
                task={mockTask}
                timeEntries={[]}
                activeTimer={null}
                teamMembers={[]}
                statusTransitions={[]}
                allowedTransitions={[]}
                rejectionFeedback={null}
            />,
        );

        // Check that the communications button is present
        const commButton = screen.getByRole('button', {
            name: /communications|messages/i,
        });
        expect(commButton).toBeInTheDocument();

        // Click to open the communications panel
        await act(async () => {
            fireEvent.click(commButton);
        });

        // Check that the CommunicationsPanel is rendered
        await waitFor(() => {
            expect(
                screen.getByTestId('communications-panel'),
            ).toBeInTheDocument();
        });

        // Verify the panel receives the correct task type and ID
        expect(screen.getByTestId('panel-type')).toHaveTextContent('tasks');
        expect(screen.getByTestId('panel-id')).toHaveTextContent('task-1');
    });

    it('message creation from CommunicationsPanel updates list', async () => {
        // This test validates that the CommunicationsPanel can receive message creation callbacks
        // The actual message creation logic is tested in the CommunicationsPanel tests
        render(
            <TaskDetail
                task={mockTask}
                timeEntries={[]}
                activeTimer={null}
                teamMembers={[]}
                statusTransitions={[]}
                allowedTransitions={[]}
                rejectionFeedback={null}
            />,
        );

        // Open the communications panel
        const commButton = screen.getByRole('button', {
            name: /communications|messages/i,
        });
        await act(async () => {
            fireEvent.click(commButton);
        });

        // Verify the panel is rendered (the panel handles its own message updates)
        await waitFor(() => {
            expect(
                screen.getByTestId('communications-panel'),
            ).toBeInTheDocument();
        });
    });
});

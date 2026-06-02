import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mock Inertia
vi.mock('@inertiajs/react', () => ({
    Head: ({ title }: { title: string }) => <title>{title}</title>,
    Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
        <a href={href} {...props}>
            {children}
        </a>
    ),
    useForm: vi.fn(() => ({
        data: { title: '', description: '', status: '', assigned_to_id: '', due_date: '', estimated_hours: '' },
        setData: vi.fn(),
        patch: vi.fn(),
        post: vi.fn(),
        processing: false,
        errors: {},
        reset: vi.fn(),
    })),
    router: {
        patch: vi.fn(),
        post: vi.fn(),
        delete: vi.fn(),
        visit: vi.fn(),
    },
    usePage: vi.fn(() => ({
        props: {
            auth: { user: { id: 1, name: 'Test User' } },
        },
    })),
}));

// Mock the components we use
vi.mock('@/components/ui/status-badge', () => ({
    StatusBadge: ({ status, variant }: { status: string; variant: string }) => (
        <span data-testid="status-badge" data-status={status} data-variant={variant}>
            {status}
        </span>
    ),
    taskStatusLabels: {
        todo: 'To Do',
        in_progress: 'In Progress',
        in_review: 'In Review',
        approved: 'Approved',
        done: 'Done',
        blocked: 'Blocked',
        cancelled: 'Cancelled',
        revision_requested: 'Revision Requested',
    },
}));

vi.mock('@/components/workflow', () => ({
    TransitionButton: ({
        currentStatus,
        allowedTransitions,
        onTransition,
    }: {
        currentStatus: string;
        allowedTransitions: { value: string; label: string }[];
        onTransition: (status: string) => void;
    }) => (
        <div data-testid="transition-button" data-current-status={currentStatus}>
            {allowedTransitions.map((t) => (
                <button key={t.value} onClick={() => onTransition(t.value)} data-testid={`transition-${t.value}`}>
                    {t.label}
                </button>
            ))}
        </div>
    ),
    TransitionDialog: vi.fn(() => null),
    TransitionHistory: ({
        transitions,
        variant,
    }: {
        transitions: { id: number; fromStatus: string; toStatus: string }[];
        variant: string;
    }) => (
        <div data-testid="transition-history" data-variant={variant}>
            {transitions.map((t) => (
                <div key={t.id} data-testid={`transition-${t.id}`}>
                    {t.fromStatus} -&gt; {t.toStatus}
                </div>
            ))}
        </div>
    ),
    TimerConfirmationDialog: vi.fn(() => null),
}));

vi.mock('@/layouts/app-layout', () => ({
    default: ({ children }: { children: React.ReactNode }) => <div data-testid="app-layout">{children}</div>,
}));

vi.mock('@/components/work', () => ({
    StatusBadge: ({ status }: { status: string }) => <span data-testid="work-status-badge">{status}</span>,
    ProgressBar: ({ progress }: { progress: number }) => <div data-testid="progress-bar">{progress}%</div>,
}));

vi.mock('@/components/time-tracking', () => ({
    HoursProgressIndicator: () => <div data-testid="hours-progress" />,
}));

// Import the component after mocks are set up
import TaskDetail from '../[id]';

const mockTask = {
    id: '1',
    title: 'Test Task',
    description: 'Test description',
    workOrderId: '1',
    workOrderTitle: 'Test Work Order',
    projectId: '1',
    projectName: 'Test Project',
    assignedToId: '1',
    assignedToName: 'John Doe',
    assignedAgentId: null,
    assignedAgentName: null,
    status: 'in_progress',
    dueDate: '2026-01-25',
    estimatedHours: 8,
    actualHours: 4,
    checklistItems: [],
    dependencies: [],
    isBlocked: false,
};

const mockTimeEntries: Array<{
    id: string;
    userId: string;
    userName: string;
    hours: number;
    date: string;
    mode: string;
    note: string | null;
    startedAt: string | null;
    stoppedAt: string | null;
}> = [];

const mockTeamMembers = [
    { id: '1', name: 'John Doe' },
    { id: '2', name: 'Jane Smith' },
];

const mockStatusTransitions = [
    {
        id: 1,
        actionType: 'status_change' as const,
        fromStatus: 'todo',
        toStatus: 'in_progress',
        fromAssignedTo: null,
        toAssignedTo: null,
        fromAssignedAgent: null,
        toAssignedAgent: null,
        fromDueDate: null,
        toDueDate: null,
        user: { id: 1, name: 'John Doe', email: 'john@example.com' },
        createdAt: '2026-01-17T10:00:00Z',
        comment: null,
        commentCategory: null,
    },
    {
        id: 2,
        actionType: 'status_change' as const,
        fromStatus: 'in_progress',
        toStatus: 'in_review',
        fromAssignedTo: null,
        toAssignedTo: null,
        fromAssignedAgent: null,
        toAssignedAgent: null,
        fromDueDate: null,
        toDueDate: null,
        user: { id: 1, name: 'John Doe', email: 'john@example.com' },
        createdAt: '2026-01-18T14:00:00Z',
        comment: null,
        commentCategory: null,
    },
];

const mockAllowedTransitions = [
    { value: 'in_review', label: 'Submit for Review' },
    { value: 'done', label: 'Mark as Done' },
    { value: 'blocked', label: 'Mark as Blocked' },
    { value: 'cancelled', label: 'Cancel' },
];

describe('TaskDetail - Task Group 15 Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('displays current status with badge', () => {
        render(
            <TaskDetail
                task={mockTask}
                timeEntries={mockTimeEntries}
                activeTimer={null}
                teamMembers={mockTeamMembers}
                statusTransitions={mockStatusTransitions}
                allowedTransitions={mockAllowedTransitions}
                rejectionFeedback={null}
            />
        );

        // Check that the status badge is present with correct status
        const statusBadge = screen.getByTestId('work-status-badge');
        expect(statusBadge).toBeInTheDocument();
        expect(statusBadge).toHaveTextContent('in_progress');
    });

    it('displays transition button with valid transitions', () => {
        render(
            <TaskDetail
                task={mockTask}
                timeEntries={mockTimeEntries}
                activeTimer={null}
                teamMembers={mockTeamMembers}
                statusTransitions={mockStatusTransitions}
                allowedTransitions={mockAllowedTransitions}
                rejectionFeedback={null}
            />
        );

        // Check that transition button is present
        const transitionButton = screen.getByTestId('transition-button');
        expect(transitionButton).toBeInTheDocument();
        expect(transitionButton).toHaveAttribute('data-current-status', 'in_progress');

        // Check that allowed transitions are shown
        expect(screen.getByTestId('transition-in_review')).toBeInTheDocument();
        expect(screen.getByTestId('transition-done')).toBeInTheDocument();
        expect(screen.getByTestId('transition-blocked')).toBeInTheDocument();
        expect(screen.getByTestId('transition-cancelled')).toBeInTheDocument();
    });

    it('displays transition history section', () => {
        render(
            <TaskDetail
                task={mockTask}
                timeEntries={mockTimeEntries}
                activeTimer={null}
                teamMembers={mockTeamMembers}
                statusTransitions={mockStatusTransitions}
                allowedTransitions={mockAllowedTransitions}
                rejectionFeedback={null}
            />
        );

        // Check that transition history is present
        const transitionHistory = screen.getByTestId('transition-history');
        expect(transitionHistory).toBeInTheDocument();
        expect(transitionHistory).toHaveAttribute('data-variant', 'task');

        // Check that transitions are displayed
        expect(screen.getByTestId('transition-1')).toBeInTheDocument();
        expect(screen.getByTestId('transition-2')).toBeInTheDocument();
    });

    it('displays rejection feedback banner when status is in_progress after revision', () => {
        const rejectionFeedback = {
            comment: 'Please fix the formatting issues and add more details.',
            user: { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
            createdAt: '2026-01-18T15:00:00Z',
        };

        render(
            <TaskDetail
                task={mockTask}
                timeEntries={mockTimeEntries}
                activeTimer={null}
                teamMembers={mockTeamMembers}
                statusTransitions={mockStatusTransitions}
                allowedTransitions={mockAllowedTransitions}
                rejectionFeedback={rejectionFeedback}
            />
        );

        // Check that rejection feedback banner is displayed
        expect(screen.getByText(/revision requested/i)).toBeInTheDocument();
        expect(screen.getByText(/Please fix the formatting issues and add more details./i)).toBeInTheDocument();
        expect(screen.getByText(/Jane Smith/i)).toBeInTheDocument();
    });
});

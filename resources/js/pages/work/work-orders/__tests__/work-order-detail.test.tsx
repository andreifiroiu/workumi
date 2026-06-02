import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import React from 'react';

/**
 * Mock data for tests
 */
const mockWorkOrder = {
    id: '1',
    title: 'Test Work Order',
    description: 'Test description',
    projectId: '1',
    projectName: 'Test Project',
    assignedToId: '1',
    assignedToName: 'John Doe',
    status: 'active',
    priority: 'high',
    dueDate: '2024-12-31',
    estimatedHours: 40,
    actualHours: 20,
    acceptanceCriteria: ['Criterion 1', 'Criterion 2'],
    sopAttached: false,
    sopName: null,
    partyContactId: null,
    createdBy: '1',
    createdByName: 'Admin User',
    accountableId: 1,
    accountableName: 'Admin User',
    responsibleId: 2,
    responsibleName: 'John Doe',
    reviewerId: null,
    reviewerName: null,
    consultedIds: [3],
    informedIds: [4, 5],
};

const mockTasks = [
    {
        id: '1',
        title: 'Task 1',
        description: 'Task description',
        status: 'done',
        dueDate: '2024-12-15',
        assignedToId: '1',
        assignedToName: 'John Doe',
        estimatedHours: 8,
        actualHours: 6,
        checklistItems: [{ id: '1', text: 'Item 1', completed: true }],
        isBlocked: false,
    },
];

const mockDeliverables = [
    {
        id: '1',
        title: 'Design Doc',
        description: 'Main design document',
        type: 'document',
        status: 'approved',
        version: '1.0',
        createdDate: '2024-12-01',
        deliveredDate: null,
        fileUrl: null,
        acceptanceCriteria: [],
    },
];

const mockTeamMembers = [
    { id: '1', name: 'Admin User' },
    { id: '2', name: 'John Doe' },
    { id: '3', name: 'Jane Smith' },
    { id: '4', name: 'Bob Wilson' },
    { id: '5', name: 'Alice Brown' },
];

const mockStatusTransitions = [
    {
        id: 1,
        actionType: 'status_change' as const,
        fromStatus: 'draft',
        toStatus: 'active',
        fromAssignedTo: null,
        toAssignedTo: null,
        fromAssignedAgent: null,
        toAssignedAgent: null,
        fromDueDate: null,
        toDueDate: null,
        user: { id: 1, name: 'Admin User', email: 'admin@test.com' },
        createdAt: '2024-12-01T10:00:00Z',
        comment: null,
        commentCategory: null,
    },
];

const mockAllowedTransitions = [
    { value: 'in_review', label: 'Submit for Review' },
    { value: 'delivered', label: 'Mark as Delivered' },
    { value: 'blocked', label: 'Mark as Blocked' },
    { value: 'cancelled', label: 'Cancel', destructive: true },
];

const mockRaciValue = {
    responsible_id: 2,
    accountable_id: 1,
    consulted_ids: [3],
    informed_ids: [4, 5],
};

/**
 * Create mock form return value
 */
const createMockForm = (initialData: Record<string, unknown>) => ({
    data: initialData,
    setData: vi.fn((key: string | Record<string, unknown>, value?: unknown) => {
        if (typeof key === 'object') {
            Object.assign(initialData, key);
        } else if (value !== undefined) {
            (initialData as Record<string, unknown>)[key] = value;
        }
    }),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    processing: false,
    errors: {},
    reset: vi.fn(),
});

/**
 * Mock Inertia
 */
vi.mock('@inertiajs/react', () => ({
    Head: ({ title }: { title: string }) => <title>{title}</title>,
    Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
        <a href={href}>{children}</a>
    ),
    useForm: vi.fn((data) => createMockForm(data)),
    router: {
        patch: vi.fn(),
        post: vi.fn(),
        delete: vi.fn(),
        reload: vi.fn(),
    },
}));

/**
 * Mock the layout
 */
vi.mock('@/layouts/app-layout', () => ({
    default: ({ children }: { children: React.ReactNode }) => <div data-testid="app-layout">{children}</div>,
}));

/**
 * Mock status-badge to ensure labels work
 */
vi.mock('@/components/ui/status-badge', () => ({
    workOrderStatusLabels: {
        draft: 'Draft',
        active: 'Active',
        in_review: 'In Review',
        approved: 'Approved',
        delivered: 'Delivered',
        cancelled: 'Cancelled',
        blocked: 'Blocked',
        revision_requested: 'Revision Requested',
    },
}));

/**
 * Mock workflow components
 */
vi.mock('@/components/workflow', () => ({
    TransitionButton: ({ currentStatus, allowedTransitions, onTransition, isLoading }: {
        currentStatus: string;
        allowedTransitions: Array<{ value: string; label: string }>;
        onTransition: (status: string) => void;
        isLoading: boolean;
    }) => (
        <div data-testid="transition-button">
            <span>Status: {currentStatus}</span>
            {allowedTransitions.map((t) => (
                <button key={t.value} onClick={() => onTransition(t.value)} disabled={isLoading}>
                    {t.label}
                </button>
            ))}
        </div>
    ),
    TransitionDialog: ({ isOpen, targetStatus, onConfirm, onCancel }: {
        isOpen: boolean;
        targetStatus: string;
        targetLabel: string;
        onConfirm: (comment?: string) => void;
        onCancel: () => void;
        isLoading: boolean;
    }) => isOpen ? (
        <div data-testid="transition-dialog">
            <span>Transitioning to: {targetStatus}</span>
            <button onClick={() => onConfirm()}>Confirm</button>
            <button onClick={onCancel}>Cancel</button>
        </div>
    ) : null,
    TransitionHistory: ({ transitions }: {
        transitions: Array<{
            id: number;
            fromStatus: string;
            toStatus: string;
            user: { id: number; name: string; email: string };
            createdAt: string;
            comment: string | null;
            commentCategory: string | null;
        }>;
        variant: string;
    }) => (
        <div data-testid="transition-history">
            {transitions.map((t) => (
                <div key={t.id} data-testid="transition-item">
                    <span data-testid={`transition-user-${t.id}`}>{t.user.name}</span>
                    <span>{t.fromStatus} to {t.toStatus}</span>
                    {t.comment && <span data-testid={`transition-comment-${t.id}`}>{t.comment}</span>}
                </div>
            ))}
        </div>
    ),
    RaciSelector: ({ value, users, disabled }: {
        value: { responsible_id: number | null; accountable_id: number | null; consulted_ids: number[]; informed_ids: number[] };
        onChange: (v: typeof value) => void;
        users: Array<{ id: number; name: string }>;
        entityType: string;
        disabled?: boolean;
        onConfirmationRequired?: (role: string, current: number | null, next: number | null) => void;
    }) => (
        <div data-testid="raci-selector">
            <div>
                <span>Accountable</span>
                <button data-testid="raci-accountable-trigger" disabled={disabled}>
                    {users.find((u) => u.id === value.accountable_id)?.name || 'Select'}
                </button>
            </div>
            <div>
                <span>Responsible</span>
                <button data-testid="raci-responsible-trigger" disabled={disabled}>
                    {users.find((u) => u.id === value.responsible_id)?.name || 'Select'}
                </button>
            </div>
        </div>
    ),
    AssignmentConfirmationDialog: () => null,
}));

/**
 * Mock work components
 */
vi.mock('@/components/work', () => ({
    StatusBadge: ({ status, type }: { status: string; type: string }) => {
        const labels: Record<string, string> = {
            draft: 'Draft',
            active: 'Active',
            in_review: 'In Review',
            approved: 'Approved',
            delivered: 'Delivered',
            cancelled: 'Cancelled',
            blocked: 'Blocked',
            revision_requested: 'Revision Requested',
        };
        return <span data-status={status} data-type={type}>{labels[status] || status}</span>;
    },
    PriorityBadge: ({ priority }: { priority: string }) => <span data-priority={priority}>{priority}</span>,
    ProgressBar: ({ progress }: { progress: number }) => <div data-progress={progress} />,
}));

/**
 * Mock time tracking components
 */
vi.mock('@/components/time-tracking', () => ({
    HoursProgressIndicator: ({ actualHours, estimatedHours }: { actualHours: number; estimatedHours: number }) => (
        <div data-actual={actualHours} data-estimated={estimatedHours}>
            {actualHours}/{estimatedHours}h
        </div>
    ),
}));

/**
 * Import the component - must be after mocks
 */
import WorkOrderDetail from '../[id]';

describe('WorkOrderDetail - Status Display', () => {
    it('displays current status with badge', () => {
        render(
            <WorkOrderDetail
                workOrder={mockWorkOrder}
                tasks={mockTasks}
                deliverables={mockDeliverables}
                documents={[]}
                communicationThread={null}
                messages={[]}
                teamMembers={mockTeamMembers}
                statusTransitions={mockStatusTransitions}
                allowedTransitions={mockAllowedTransitions}
                raciValue={mockRaciValue}
            />
        );

        // Check that work order status badge is displayed with active status
        const statusBadge = screen.getByText('Active');
        expect(statusBadge).toBeInTheDocument();
        expect(statusBadge).toHaveAttribute('data-status', 'active');
        expect(statusBadge).toHaveAttribute('data-type', 'workOrder');
    });

    it('displays correct status for different statuses', () => {
        const statuses = [
            { status: 'draft', label: 'Draft' },
            { status: 'in_review', label: 'In Review' },
        ];

        for (const { status, label } of statuses) {
            const { unmount } = render(
                <WorkOrderDetail
                    workOrder={{ ...mockWorkOrder, status }}
                    tasks={mockTasks}
                    deliverables={mockDeliverables}
                    documents={[]}
                    communicationThread={null}
                    messages={[]}
                    teamMembers={mockTeamMembers}
                    statusTransitions={mockStatusTransitions}
                    allowedTransitions={mockAllowedTransitions}
                    raciValue={mockRaciValue}
                />
            );

            // Find the work order status badge specifically (not deliverable)
            const statusBadge = screen.getByText(label, { selector: '[data-type="workOrder"]' });
            expect(statusBadge).toBeInTheDocument();
            expect(statusBadge).toHaveAttribute('data-status', status);
            unmount();
        }
    });
});

describe('WorkOrderDetail - RACI Selector', () => {
    it('displays RACI selector with current assignments', () => {
        render(
            <WorkOrderDetail
                workOrder={mockWorkOrder}
                tasks={mockTasks}
                deliverables={mockDeliverables}
                documents={[]}
                communicationThread={null}
                messages={[]}
                teamMembers={mockTeamMembers}
                statusTransitions={mockStatusTransitions}
                allowedTransitions={mockAllowedTransitions}
                raciValue={mockRaciValue}
            />
        );

        // Check that RACI section is present
        expect(screen.getByText('RACI Assignments')).toBeInTheDocument();

        // Check that the RACI selector is present
        expect(screen.getByTestId('raci-selector')).toBeInTheDocument();

        // Check that the accountable and responsible roles are displayed in RACI section
        // Note: 'Accountable' also appears in header stats, so we check for multiple instances
        const accountableTexts = screen.getAllByText('Accountable');
        expect(accountableTexts.length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText('Responsible')).toBeInTheDocument();
    });

    it('allows updating RACI assignments', async () => {
        render(
            <WorkOrderDetail
                workOrder={mockWorkOrder}
                tasks={mockTasks}
                deliverables={mockDeliverables}
                documents={[]}
                communicationThread={null}
                messages={[]}
                teamMembers={mockTeamMembers}
                statusTransitions={mockStatusTransitions}
                allowedTransitions={mockAllowedTransitions}
                raciValue={mockRaciValue}
            />
        );

        // The RACI selector should be interactive
        const accountableTrigger = screen.getByTestId('raci-accountable-trigger');
        expect(accountableTrigger).toBeInTheDocument();
        expect(accountableTrigger).not.toBeDisabled();
    });
});

describe('WorkOrderDetail - Transition History', () => {
    it('displays transition history section', () => {
        render(
            <WorkOrderDetail
                workOrder={mockWorkOrder}
                tasks={mockTasks}
                deliverables={mockDeliverables}
                documents={[]}
                communicationThread={null}
                messages={[]}
                teamMembers={mockTeamMembers}
                statusTransitions={mockStatusTransitions}
                allowedTransitions={mockAllowedTransitions}
                raciValue={mockRaciValue}
            />
        );

        // Check that Activity/History section is displayed
        expect(screen.getByText('Activity')).toBeInTheDocument();
        expect(screen.getByTestId('transition-history')).toBeInTheDocument();
    });

    it('displays transitions in the history', () => {
        render(
            <WorkOrderDetail
                workOrder={mockWorkOrder}
                tasks={mockTasks}
                deliverables={mockDeliverables}
                documents={[]}
                communicationThread={null}
                messages={[]}
                teamMembers={mockTeamMembers}
                statusTransitions={mockStatusTransitions}
                allowedTransitions={mockAllowedTransitions}
                raciValue={mockRaciValue}
            />
        );

        // Check that the transition user is shown using specific test id
        const transitionUser = screen.getByTestId('transition-user-1');
        expect(transitionUser).toHaveTextContent('Admin User');
    });

    it('shows rejection feedback prominently when present', () => {
        const transitionsWithRejection = [
            ...mockStatusTransitions,
            {
                id: 2,
                actionType: 'status_change' as const,
                fromStatus: 'in_review',
                toStatus: 'revision_requested',
                fromAssignedTo: null,
                toAssignedTo: null,
                fromAssignedAgent: null,
                toAssignedAgent: null,
                fromDueDate: null,
                toDueDate: null,
                user: { id: 1, name: 'Reviewer User', email: 'reviewer@test.com' },
                createdAt: '2024-12-05T10:00:00Z',
                comment: 'Please fix the formatting issues',
                commentCategory: 'quality_issue' as const,
            },
        ];

        render(
            <WorkOrderDetail
                workOrder={{ ...mockWorkOrder, status: 'active' }}
                tasks={mockTasks}
                deliverables={mockDeliverables}
                documents={[]}
                communicationThread={null}
                messages={[]}
                teamMembers={mockTeamMembers}
                statusTransitions={transitionsWithRejection}
                allowedTransitions={mockAllowedTransitions}
                raciValue={mockRaciValue}
                rejectionFeedback={{
                    comment: 'Please fix the formatting issues',
                    user: { id: 1, name: 'Reviewer User', email: 'reviewer@test.com' },
                    createdAt: '2024-12-05T10:00:00Z',
                }}
            />
        );

        // Check that rejection feedback is displayed (there will be 2 instances - banner and history)
        const feedbackElements = screen.getAllByText('Please fix the formatting issues');
        expect(feedbackElements.length).toBeGreaterThanOrEqual(1);

        // Check that the rejection banner title is present
        expect(screen.getByText('Revision Requested')).toBeInTheDocument();

        // Check that the alert element exists with proper role
        const alert = screen.getByRole('alert');
        expect(alert).toBeInTheDocument();
    });
});

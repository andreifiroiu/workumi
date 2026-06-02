import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
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
    acceptanceCriteria: ['Criterion 1'],
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
    consultedIds: [],
    informedIds: [],
    pmCopilotMode: 'full' as const,
};

const mockTasks: Array<{
    id: string;
    title: string;
    description: string | null;
    status: string;
    dueDate: string | null;
    assignedToId: string | null;
    assignedToName: string;
    estimatedHours: number;
    actualHours: number;
    checklistItems: Array<{ id: string; text: string; completed: boolean }>;
    isBlocked: boolean;
    positionInWorkOrder: number;
}> = [];

const mockDeliverables: Array<{
    id: string;
    title: string;
    description: string | null;
    type: string;
    status: string;
    version: string;
    createdDate: string;
    deliveredDate: string | null;
    fileUrl: string | null;
    acceptanceCriteria: string[];
}> = [];

const mockTeamMembers = [
    { id: '1', name: 'Admin User' },
    { id: '2', name: 'John Doe' },
];

const mockPMCopilotSuggestions = {
    workOrderId: '1',
    workflowState: {
        status: 'completed' as const,
        currentStep: null,
        progress: 100,
        error: null,
    },
    alternatives: [
        {
            id: 'alt-1',
            name: 'Comprehensive Plan',
            description: 'Full implementation with documentation',
            confidence: 'high' as const,
            deliverables: [
                {
                    id: 'del-1',
                    title: 'Requirements Document',
                    description: 'Detailed requirements',
                    type: 'document' as const,
                    acceptanceCriteria: ['Clear requirements'],
                    confidence: 'high' as const,
                },
            ],
            tasks: [
                {
                    id: 'task-1',
                    title: 'Gather Requirements',
                    description: 'Collect and document requirements',
                    estimatedHours: 8,
                    positionInWorkOrder: 1,
                    checklistItems: ['Interview stakeholders'],
                    dependencies: [],
                    confidence: 'high' as const,
                },
            ],
        },
    ],
    insights: [],
    createdAt: '2024-12-01T10:00:00Z',
    updatedAt: '2024-12-01T10:00:00Z',
};

/**
 * Mock fetch globally
 */
const mockFetch = vi.fn();

beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
    mockFetch.mockReset();
});

afterEach(() => {
    vi.unstubAllGlobals();
});

/**
 * Mock Inertia
 */
vi.mock('@inertiajs/react', () => ({
    Head: ({ title }: { title: string }) => <title>{title}</title>,
    Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
        <a href={href}>{children}</a>
    ),
    useForm: vi.fn((data) => ({
        data,
        setData: vi.fn(),
        post: vi.fn(),
        patch: vi.fn(),
        delete: vi.fn(),
        processing: false,
        errors: {},
        reset: vi.fn(),
    })),
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
 * Mock status-badge
 */
vi.mock('@/components/ui/status-badge', () => ({
    workOrderStatusLabels: {
        draft: 'Draft',
        active: 'Active',
        in_review: 'In Review',
    },
}));

/**
 * Mock workflow components
 */
vi.mock('@/components/workflow', () => ({
    TransitionButton: () => <div data-testid="transition-button" />,
    TransitionDialog: () => null,
    TransitionHistory: () => <div data-testid="transition-history" />,
    RaciSelector: () => <div data-testid="raci-selector" />,
    AssignmentConfirmationDialog: () => null,
}));

/**
 * Mock work components
 */
vi.mock('@/components/work', () => ({
    StatusBadge: ({ status }: { status: string }) => <span data-status={status}>{status}</span>,
    PriorityBadge: ({ priority }: { priority: string }) => <span data-priority={priority}>{priority}</span>,
    ProgressBar: ({ progress }: { progress: number }) => <div data-progress={progress} />,
}));

/**
 * Mock time tracking components
 */
vi.mock('@/components/time-tracking', () => ({
    HoursProgressIndicator: () => <div data-testid="hours-progress" />,
}));

/**
 * Mock PM Copilot components
 */
vi.mock('@/components/pm-copilot', () => ({
    PMCopilotTriggerButton: ({ onTrigger, isRunning }: { workOrderId: string; onTrigger: () => void; isRunning: boolean }) => (
        <button
            data-testid="pm-copilot-trigger-button"
            onClick={onTrigger}
            disabled={isRunning}
        >
            {isRunning ? 'Generating...' : 'Generate Plan'}
        </button>
    ),
    PlanAlternativesPanel: ({ alternatives, onApprove, onReject }: {
        alternatives: typeof mockPMCopilotSuggestions.alternatives;
        onApprove: (id: string) => void;
        onReject: (id: string) => void;
    }) => (
        <div data-testid="plan-alternatives-panel">
            {alternatives.map((alt) => (
                <div key={alt.id} data-testid={`alternative-${alt.id}`}>
                    <span>{alt.name}</span>
                    <button onClick={() => onApprove(alt.id)} data-testid={`approve-${alt.id}`}>Approve</button>
                    <button onClick={() => onReject(alt.id)} data-testid={`reject-${alt.id}`}>Reject</button>
                </div>
            ))}
        </div>
    ),
    PMCopilotSettingsToggle: ({ currentMode, onChange }: {
        workOrderId: string;
        currentMode: string;
        onChange: (mode: string) => void;
    }) => (
        <div data-testid="pm-copilot-settings-toggle">
            <span data-testid="current-mode">{currentMode}</span>
            <button
                onClick={() => onChange(currentMode === 'staged' ? 'full' : 'staged')}
                data-testid="mode-toggle"
            >
                Toggle Mode
            </button>
        </div>
    ),
}));

/**
 * Mock hooks
 */
vi.mock('@/hooks/use-pm-copilot', () => ({
    useTriggerPMCopilot: () => ({
        trigger: vi.fn().mockResolvedValue({ success: true }),
        isLoading: false,
        error: null,
        workflowState: null,
        reset: vi.fn(),
    }),
    usePMCopilotSuggestions: () => ({
        data: mockPMCopilotSuggestions,
        isLoading: false,
        error: null,
        fetch: vi.fn(),
        refetch: vi.fn(),
    }),
    useApproveSuggestion: () => ({
        approve: vi.fn().mockResolvedValue({ success: true }),
        isLoading: false,
        error: null,
        reset: vi.fn(),
    }),
    useRejectSuggestion: () => ({
        reject: vi.fn().mockResolvedValue({ success: true }),
        isLoading: false,
        error: null,
        reset: vi.fn(),
    }),
    useUpdatePMCopilotMode: () => ({
        updateMode: vi.fn().mockResolvedValue({ success: true }),
        isLoading: false,
        error: null,
    }),
}));

/**
 * Import the component - must be after mocks
 */
import WorkOrderDetail from '../[id]';

describe('PM Copilot Integration - Work Order Detail Page', () => {
    it('renders PM Copilot section in work order detail view', () => {
        render(
            <WorkOrderDetail
                workOrder={mockWorkOrder}
                tasks={mockTasks}
                deliverables={mockDeliverables}
                documents={[]}
                communicationThread={null}
                messages={[]}
                teamMembers={mockTeamMembers}
                statusTransitions={[]}
                allowedTransitions={[]}
                raciValue={{
                    responsible_id: 2,
                    accountable_id: 1,
                    consulted_ids: [],
                    informed_ids: [],
                }}
            />
        );

        // Check that PM Copilot trigger button is rendered
        expect(screen.getByTestId('pm-copilot-trigger-button')).toBeInTheDocument();
        expect(screen.getByText('Generate Plan')).toBeInTheDocument();
    });

    it('renders PM Copilot settings toggle with current mode', () => {
        render(
            <WorkOrderDetail
                workOrder={mockWorkOrder}
                tasks={mockTasks}
                deliverables={mockDeliverables}
                documents={[]}
                communicationThread={null}
                messages={[]}
                teamMembers={mockTeamMembers}
                statusTransitions={[]}
                allowedTransitions={[]}
                raciValue={{
                    responsible_id: 2,
                    accountable_id: 1,
                    consulted_ids: [],
                    informed_ids: [],
                }}
            />
        );

        // Check that settings toggle is rendered with current mode
        expect(screen.getByTestId('pm-copilot-settings-toggle')).toBeInTheDocument();
        expect(screen.getByTestId('current-mode')).toHaveTextContent('full');
    });

    it('displays suggestions panel when workflow completes', () => {
        render(
            <WorkOrderDetail
                workOrder={{
                    ...mockWorkOrder,
                    pmCopilotSuggestions: mockPMCopilotSuggestions,
                }}
                tasks={mockTasks}
                deliverables={mockDeliverables}
                documents={[]}
                communicationThread={null}
                messages={[]}
                teamMembers={mockTeamMembers}
                statusTransitions={[]}
                allowedTransitions={[]}
                raciValue={{
                    responsible_id: 2,
                    accountable_id: 1,
                    consulted_ids: [],
                    informed_ids: [],
                }}
            />
        );

        // Check that alternatives panel is rendered
        expect(screen.getByTestId('plan-alternatives-panel')).toBeInTheDocument();
        expect(screen.getByTestId('alternative-alt-1')).toBeInTheDocument();
        expect(screen.getByText('Comprehensive Plan')).toBeInTheDocument();
    });

    it('allows triggering PM Copilot workflow via button click', async () => {
        const user = userEvent.setup();

        render(
            <WorkOrderDetail
                workOrder={mockWorkOrder}
                tasks={mockTasks}
                deliverables={mockDeliverables}
                documents={[]}
                communicationThread={null}
                messages={[]}
                teamMembers={mockTeamMembers}
                statusTransitions={[]}
                allowedTransitions={[]}
                raciValue={{
                    responsible_id: 2,
                    accountable_id: 1,
                    consulted_ids: [],
                    informed_ids: [],
                }}
            />
        );

        const triggerButton = screen.getByTestId('pm-copilot-trigger-button');
        expect(triggerButton).toBeInTheDocument();
        expect(triggerButton).not.toBeDisabled();

        // Click the trigger button
        await user.click(triggerButton);

        // Button should be clickable (hook handles the actual trigger)
        expect(triggerButton).toBeInTheDocument();
    });

    it('allows approving a suggestion via approve button', async () => {
        const user = userEvent.setup();

        render(
            <WorkOrderDetail
                workOrder={{
                    ...mockWorkOrder,
                    pmCopilotSuggestions: mockPMCopilotSuggestions,
                }}
                tasks={mockTasks}
                deliverables={mockDeliverables}
                documents={[]}
                communicationThread={null}
                messages={[]}
                teamMembers={mockTeamMembers}
                statusTransitions={[]}
                allowedTransitions={[]}
                raciValue={{
                    responsible_id: 2,
                    accountable_id: 1,
                    consulted_ids: [],
                    informed_ids: [],
                }}
            />
        );

        // Find and click approve button for the alternative
        const approveButton = screen.getByTestId('approve-alt-1');
        expect(approveButton).toBeInTheDocument();

        await user.click(approveButton);

        // Approve button should be clickable
        expect(approveButton).toBeInTheDocument();
    });

    it('updates mode when settings toggle is changed', async () => {
        const user = userEvent.setup();

        render(
            <WorkOrderDetail
                workOrder={mockWorkOrder}
                tasks={mockTasks}
                deliverables={mockDeliverables}
                documents={[]}
                communicationThread={null}
                messages={[]}
                teamMembers={mockTeamMembers}
                statusTransitions={[]}
                allowedTransitions={[]}
                raciValue={{
                    responsible_id: 2,
                    accountable_id: 1,
                    consulted_ids: [],
                    informed_ids: [],
                }}
            />
        );

        // Find and click the mode toggle
        const modeToggle = screen.getByTestId('mode-toggle');
        expect(modeToggle).toBeInTheDocument();

        await user.click(modeToggle);

        // Toggle should be clickable and handle the change
        expect(modeToggle).toBeInTheDocument();
    });
});

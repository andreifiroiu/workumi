import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PMCopilotTriggerButton } from '../pm-copilot-trigger-button';
import { PlanAlternativesPanel } from '../plan-alternatives-panel';
import { DeliverableSuggestionCard } from '../deliverable-suggestion-card';
import { InsightCard } from '../insight-card';
import type {
    PlanAlternative,
    DeliverableSuggestion,
    ProjectInsight,
} from '@/types/pm-copilot.d';

// Mock Inertia router
vi.mock('@inertiajs/react', () => ({
    router: {
        post: vi.fn(),
        patch: vi.fn(),
    },
    usePage: () => ({
        props: {
            auth: { user: { id: '1', name: 'Test User' } },
        },
    }),
}));

// Mock data for plan alternatives
const mockAlternatives: PlanAlternative[] = [
    {
        id: 'alt-1',
        name: 'Standard Approach',
        description: 'A traditional project structure with sequential deliverables',
        confidence: 'high',
        deliverables: [
            {
                id: 'del-1',
                title: 'Requirements Document',
                description: 'Detailed requirements specification',
                type: 'document',
                acceptanceCriteria: ['All stakeholders signed off', 'Complete feature list'],
                confidence: 'high',
            },
        ],
        tasks: [
            {
                id: 'task-1',
                title: 'Gather Requirements',
                description: 'Collect requirements from stakeholders',
                estimatedHours: 8,
                positionInWorkOrder: 1,
                checklistItems: ['Schedule meetings', 'Document findings'],
                dependencies: [],
                confidence: 'high',
            },
        ],
    },
    {
        id: 'alt-2',
        name: 'Agile Approach',
        description: 'Iterative delivery with sprints',
        confidence: 'medium',
        deliverables: [
            {
                id: 'del-2',
                title: 'Sprint Backlog',
                description: 'Prioritized list of user stories',
                type: 'document',
                acceptanceCriteria: ['Stories estimated', 'Prioritized by PO'],
                confidence: 'medium',
            },
        ],
        tasks: [
            {
                id: 'task-2',
                title: 'Create User Stories',
                description: 'Break down requirements into user stories',
                estimatedHours: 4,
                positionInWorkOrder: 1,
                checklistItems: ['Define acceptance criteria'],
                dependencies: [],
                confidence: 'medium',
            },
        ],
    },
];

// Mock deliverable suggestion - using a unique type to avoid conflicts
const mockDeliverableSuggestion: DeliverableSuggestion = {
    id: 'del-1',
    title: 'API Documentation',
    description: 'Comprehensive API reference documentation',
    type: 'document',
    acceptanceCriteria: ['All endpoints documented', 'Examples included', 'Authentication covered'],
    confidence: 'high',
};

// Mock project insight
const mockInsight: ProjectInsight = {
    id: 'insight-1',
    type: 'bottleneck',
    severity: 'medium',
    title: 'Potential Bottleneck Detected',
    description: 'Task "API Integration" has 3 dependent tasks waiting on it',
    suggestion: 'Consider assigning additional resources or breaking down the task',
    affectedItems: [
        { id: 'task-1', type: 'task', title: 'API Integration' },
        { id: 'task-2', type: 'task', title: 'Frontend Integration' },
        { id: 'task-3', type: 'task', title: 'Testing' },
    ],
    confidence: 'high',
};

describe('PMCopilotTriggerButton', () => {
    it('renders and handles click', async () => {
        const user = userEvent.setup();
        const onTrigger = vi.fn();

        render(
            <PMCopilotTriggerButton
                workOrderId="wo-123"
                onTrigger={onTrigger}
            />
        );

        const button = screen.getByRole('button', { name: /generate plan/i });
        expect(button).toBeInTheDocument();

        await user.click(button);
        expect(onTrigger).toHaveBeenCalledTimes(1);
    });

    it('shows loading state while workflow runs', () => {
        const onTrigger = vi.fn();

        render(
            <PMCopilotTriggerButton
                workOrderId="wo-123"
                onTrigger={onTrigger}
                isRunning={true}
            />
        );

        const button = screen.getByRole('button');
        expect(button).toBeDisabled();
        expect(screen.getByText(/generating/i)).toBeInTheDocument();
    });

    it('disables button when workflow is in progress', () => {
        const onTrigger = vi.fn();

        render(
            <PMCopilotTriggerButton
                workOrderId="wo-123"
                onTrigger={onTrigger}
                disabled={true}
            />
        );

        const button = screen.getByRole('button');
        expect(button).toBeDisabled();
    });
});

describe('PlanAlternativesPanel', () => {
    it('displays alternatives with confidence badges', () => {
        const onApprove = vi.fn();
        const onReject = vi.fn();

        render(
            <PlanAlternativesPanel
                alternatives={mockAlternatives}
                onApprove={onApprove}
                onReject={onReject}
            />
        );

        // Check alternatives are displayed
        expect(screen.getByText('Standard Approach')).toBeInTheDocument();
        expect(screen.getByText('Agile Approach')).toBeInTheDocument();

        // Check confidence badges
        expect(screen.getByText(/high/i)).toBeInTheDocument();
        expect(screen.getByText(/medium/i)).toBeInTheDocument();
    });

    it('handles approve action', async () => {
        const user = userEvent.setup();
        const onApprove = vi.fn();
        const onReject = vi.fn();

        render(
            <PlanAlternativesPanel
                alternatives={mockAlternatives}
                onApprove={onApprove}
                onReject={onReject}
            />
        );

        // Find and click approve button for first alternative
        const approveButtons = screen.getAllByRole('button', { name: /approve/i });
        await user.click(approveButtons[0]);

        expect(onApprove).toHaveBeenCalledWith('alt-1');
    });

    it('handles reject action', async () => {
        const user = userEvent.setup();
        const onApprove = vi.fn();
        const onReject = vi.fn();

        render(
            <PlanAlternativesPanel
                alternatives={mockAlternatives}
                onApprove={onApprove}
                onReject={onReject}
            />
        );

        // Find and click reject button for first alternative
        const rejectButtons = screen.getAllByRole('button', { name: /reject/i });
        await user.click(rejectButtons[0]);

        expect(onReject).toHaveBeenCalledWith('alt-1', undefined);
    });
});

describe('DeliverableSuggestionCard', () => {
    it('displays deliverable details and confidence', () => {
        const onApprove = vi.fn();
        const onReject = vi.fn();

        render(
            <DeliverableSuggestionCard
                suggestion={mockDeliverableSuggestion}
                onApprove={onApprove}
                onReject={onReject}
            />
        );

        // Check content is displayed
        expect(screen.getByText('API Documentation')).toBeInTheDocument();
        expect(screen.getByText(/comprehensive api reference/i)).toBeInTheDocument();

        // Check type badge is displayed (use exact match for badge)
        expect(screen.getByText('Document')).toBeInTheDocument();

        // Check confidence indicator
        expect(screen.getByText(/high/i)).toBeInTheDocument();

        // Check acceptance criteria
        expect(screen.getByText(/all endpoints documented/i)).toBeInTheDocument();
    });

    it('handles approve and reject actions', async () => {
        const user = userEvent.setup();
        const onApprove = vi.fn();
        const onReject = vi.fn();

        render(
            <DeliverableSuggestionCard
                suggestion={mockDeliverableSuggestion}
                onApprove={onApprove}
                onReject={onReject}
            />
        );

        // Test approve
        const approveButton = screen.getByRole('button', { name: /approve/i });
        await user.click(approveButton);
        expect(onApprove).toHaveBeenCalledWith('del-1');

        // Test reject
        const rejectButton = screen.getByRole('button', { name: /reject/i });
        await user.click(rejectButton);
        expect(onReject).toHaveBeenCalledWith('del-1', undefined);
    });
});

describe('InsightCard', () => {
    it('displays insight with severity indicator', () => {
        const onClick = vi.fn();

        render(
            <InsightCard
                insight={mockInsight}
                onClick={onClick}
            />
        );

        // Check title and description
        expect(screen.getByText('Potential Bottleneck Detected')).toBeInTheDocument();
        expect(screen.getByText(/3 dependent tasks/i)).toBeInTheDocument();

        // Check suggestion is displayed
        expect(screen.getByText(/consider assigning additional resources/i)).toBeInTheDocument();

        // Check affected items count
        expect(screen.getByText(/3 items affected/i)).toBeInTheDocument();
    });

    it('shows correct severity styling', () => {
        render(
            <InsightCard
                insight={mockInsight}
            />
        );

        // The card should have warning styling
        const card = screen.getByTestId('insight-card');
        expect(card).toHaveClass('border-amber-200');
    });

    it('handles click interaction', async () => {
        const user = userEvent.setup();
        const onClick = vi.fn();

        render(
            <InsightCard
                insight={mockInsight}
                onClick={onClick}
            />
        );

        const card = screen.getByTestId('insight-card');
        await user.click(card);

        expect(onClick).toHaveBeenCalledTimes(1);
    });
});

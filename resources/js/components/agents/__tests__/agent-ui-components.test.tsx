import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AgentPermissionsPanel } from '../AgentPermissionsPanel';
import { AgentToolsPanel } from '../AgentToolsPanel';
import { ActivityDetailModal } from '../ActivityDetailModal';
import { BudgetDisplay } from '../BudgetDisplay';

// Mock permissions data
const mockPermissions = {
    canCreateWorkOrders: true,
    canModifyTasks: true,
    canAccessClientData: false,
    canSendEmails: false,
    canModifyDeliverables: true,
    canAccessFinancialData: false,
    canModifyPlaybooks: false,
};

// Mock behavior settings
const mockBehaviorSettings = {
    verbosityLevel: 'balanced' as const,
    creativityLevel: 'balanced' as const,
    riskTolerance: 'medium' as const,
};

// Mock tools data
const mockTools = [
    {
        name: 'task-list',
        description: 'List tasks for a project or work order',
        category: 'tasks',
        requiredPermissions: ['can_modify_tasks'],
        enabled: true,
    },
    {
        name: 'create-work-order',
        description: 'Create a new work order',
        category: 'work_orders',
        requiredPermissions: ['can_create_work_orders'],
        enabled: true,
    },
    {
        name: 'send-email',
        description: 'Send an email to a client',
        category: 'email',
        requiredPermissions: ['can_send_emails'],
        enabled: false,
    },
];

// Mock activity log with tool calls
const mockActivityLog = {
    id: 1,
    agentId: 1,
    agentName: 'PM Copilot',
    runType: 'task_generation',
    timestamp: '2026-01-19T10:00:00Z',
    input: 'Generate tasks for website redesign project',
    output: 'Generated 5 tasks successfully',
    tokensUsed: 450,
    cost: 0.0375,
    approvalStatus: 'approved' as const,
    approvedBy: 1,
    approvedAt: '2026-01-19T10:05:00Z',
    error: null,
    toolCalls: [
        {
            name: 'task-list',
            params: { projectId: '123', status: 'active' },
            result: { tasks: [], count: 0 },
            durationMs: 120,
        },
        {
            name: 'create-task',
            params: { title: 'Design mockups', workOrderId: '456' },
            result: { taskId: '789', success: true },
            durationMs: 85,
        },
    ],
    contextAccessed: ['project:123', 'work_order:456'],
};

// Mock budget data - ensure category total differs from monthly spent
const mockBudget = {
    dailyCap: 50,
    dailySpent: 12.40,
    monthlyCap: 150,
    monthlySpent: 87.40,
    costByCategory: [
        { category: 'tasks', cost: 35.20 },
        { category: 'work_orders', cost: 22.15 },
        { category: 'general', cost: 7.95 },
    ],
};

describe('AgentPermissionsPanel', () => {
    it('renders all permission checkboxes', () => {
        const onChange = vi.fn();

        render(
            <AgentPermissionsPanel
                permissions={mockPermissions}
                behaviorSettings={mockBehaviorSettings}
                onChange={onChange}
            />
        );

        // Check for permission checkboxes by their labels
        expect(screen.getByLabelText(/create work orders/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/modify tasks/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/access client data/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/send emails/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/modify deliverables/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/access financial data/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/modify playbooks/i)).toBeInTheDocument();
    });

    it('displays checked state for enabled permissions', () => {
        const onChange = vi.fn();

        render(
            <AgentPermissionsPanel
                permissions={mockPermissions}
                behaviorSettings={mockBehaviorSettings}
                onChange={onChange}
            />
        );

        // Work Orders should be checked
        const workOrdersCheckbox = screen.getByLabelText(/create work orders/i);
        expect(workOrdersCheckbox).toBeChecked();

        // Send Emails should not be checked
        const emailsCheckbox = screen.getByLabelText(/send emails/i);
        expect(emailsCheckbox).not.toBeChecked();
    });
});

describe('AgentToolsPanel', () => {
    it('renders tool category toggles', () => {
        const onChange = vi.fn();

        render(
            <AgentToolsPanel
                tools={mockTools}
                permissions={mockPermissions}
                onChange={onChange}
            />
        );

        // Check for tool names
        expect(screen.getByText('task-list')).toBeInTheDocument();
        expect(screen.getByText('create-work-order')).toBeInTheDocument();
        expect(screen.getByText('send-email')).toBeInTheDocument();
    });

    it('shows tool descriptions', () => {
        const onChange = vi.fn();

        render(
            <AgentToolsPanel
                tools={mockTools}
                permissions={mockPermissions}
                onChange={onChange}
            />
        );

        expect(screen.getByText(/list tasks for a project/i)).toBeInTheDocument();
        expect(screen.getByText(/create a new work order/i)).toBeInTheDocument();
    });

    it('disables tools that require unavailable permissions', () => {
        const onChange = vi.fn();

        render(
            <AgentToolsPanel
                tools={mockTools}
                permissions={mockPermissions}
                onChange={onChange}
            />
        );

        // send-email requires can_send_emails which is false
        // The tool row should indicate it's disabled due to missing permissions
        const sendEmailRow = screen.getByTestId('tool-row-send-email');
        expect(sendEmailRow).toHaveClass('opacity-50');
    });
});

describe('ActivityDetailModal', () => {
    it('displays tool calls with name, params, result, and duration', () => {
        const onClose = vi.fn();

        render(
            <ActivityDetailModal
                activity={mockActivityLog}
                isOpen={true}
                onClose={onClose}
            />
        );

        // Check for tool call information
        expect(screen.getByText('task-list')).toBeInTheDocument();
        expect(screen.getByText('create-task')).toBeInTheDocument();

        // Check for duration display
        expect(screen.getByText(/120ms/)).toBeInTheDocument();
        expect(screen.getByText(/85ms/)).toBeInTheDocument();
    });

    it('displays activity metadata', () => {
        const onClose = vi.fn();

        render(
            <ActivityDetailModal
                activity={mockActivityLog}
                isOpen={true}
                onClose={onClose}
            />
        );

        // Check for tokens and cost
        expect(screen.getByText(/450/)).toBeInTheDocument();
        expect(screen.getByText(/\$0\.0375/)).toBeInTheDocument();
    });
});

describe('BudgetDisplay', () => {
    it('shows daily and monthly budget breakdown', () => {
        render(<BudgetDisplay budget={mockBudget} />);

        // Check for section headers
        expect(screen.getByText('Daily Budget')).toBeInTheDocument();
        expect(screen.getByText('Monthly Budget')).toBeInTheDocument();

        // Check for daily budget cap
        expect(screen.getByText('$50.00')).toBeInTheDocument();

        // Check for monthly budget cap
        expect(screen.getByText('$150.00')).toBeInTheDocument();

        // Verify both daily and monthly sections are present
        expect(screen.getByText('Daily Cap')).toBeInTheDocument();
        expect(screen.getByText('Budget Cap')).toBeInTheDocument();
    });

    it('displays cost breakdown by category', () => {
        render(<BudgetDisplay budget={mockBudget} />);

        // Check for category breakdown section header
        expect(screen.getByText('Cost by Category')).toBeInTheDocument();

        // Check for category labels (transformed from snake_case)
        expect(screen.getByText('Tasks')).toBeInTheDocument();
        expect(screen.getByText('Work Orders')).toBeInTheDocument();
        expect(screen.getByText('General')).toBeInTheDocument();

        // Check for category costs
        expect(screen.getByText('$35.20')).toBeInTheDocument();
        expect(screen.getByText('$22.15')).toBeInTheDocument();
    });

    it('shows progress bars for budget usage', () => {
        render(<BudgetDisplay budget={mockBudget} />);

        // Check for progress bars (by role)
        const progressBars = screen.getAllByRole('progressbar');
        expect(progressBars.length).toBeGreaterThanOrEqual(2);
    });
});

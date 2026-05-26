import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TransitionHistory, type StatusTransition } from '../transition-history';

const mockUser = {
    id: 1,
    name: 'John Doe',
    email: 'john@example.com',
    avatar: undefined,
};

const mockTransitions: StatusTransition[] = [
    {
        id: 1,
        actionType: 'status_change',
        fromStatus: 'todo',
        toStatus: 'in_progress',
        fromDueDate: null,
        toDueDate: null,
        fromAssignedTo: null,
        toAssignedTo: null,
        fromAssignedAgent: null,
        toAssignedAgent: null,
        user: mockUser,
        createdAt: '2024-01-15T10:00:00Z',
        comment: null,
        commentCategory: null,
    },
    {
        id: 2,
        actionType: 'status_change',
        fromStatus: 'in_progress',
        toStatus: 'in_review',
        fromDueDate: null,
        toDueDate: null,
        fromAssignedTo: null,
        toAssignedTo: null,
        fromAssignedAgent: null,
        toAssignedAgent: null,
        user: mockUser,
        createdAt: '2024-01-15T14:00:00Z',
        comment: null,
        commentCategory: null,
    },
    {
        id: 3,
        actionType: 'status_change',
        fromStatus: 'in_review',
        toStatus: 'revision_requested',
        fromDueDate: null,
        toDueDate: null,
        fromAssignedTo: null,
        toAssignedTo: null,
        fromAssignedAgent: null,
        toAssignedAgent: null,
        user: { ...mockUser, id: 2, name: 'Jane Smith' },
        createdAt: '2024-01-16T09:00:00Z',
        comment: 'The design needs to match the brand guidelines more closely. Please update the color scheme.',
        commentCategory: 'design_impact',
    },
    {
        id: 4,
        actionType: 'status_change',
        fromStatus: 'in_progress',
        toStatus: 'in_review',
        fromDueDate: null,
        toDueDate: null,
        fromAssignedTo: null,
        toAssignedTo: null,
        fromAssignedAgent: null,
        toAssignedAgent: null,
        user: mockUser,
        createdAt: '2024-01-16T15:00:00Z',
        comment: 'Updated the design as requested.',
        commentCategory: null,
    },
];

/**
 * Build a `due_date_change` transition with sensible defaults so individual
 * tests only specify the fields under test.
 */
function dueDateTransition(overrides: Partial<StatusTransition>): StatusTransition {
    return {
        id: 99,
        actionType: 'due_date_change',
        fromStatus: '',
        toStatus: '',
        fromDueDate: null,
        toDueDate: null,
        fromAssignedTo: null,
        toAssignedTo: null,
        fromAssignedAgent: null,
        toAssignedAgent: null,
        user: mockUser,
        createdAt: '2024-01-15T10:00:00Z',
        comment: null,
        commentCategory: null,
        ...overrides,
    };
}

describe('TransitionHistory', () => {
    it('displays transitions in chronological order', () => {
        render(<TransitionHistory transitions={mockTransitions} variant="task" />);

        const historyItems = screen.getAllByRole('listitem');
        expect(historyItems).toHaveLength(4);

        // Verify order by checking that the first item shows the earliest transition
        expect(within(historyItems[0]).getByText(/to do/i)).toBeInTheDocument();
        expect(within(historyItems[0]).getByText(/in progress/i)).toBeInTheDocument();

        // Last item should be the most recent
        expect(within(historyItems[3]).getByText(/in review/i)).toBeInTheDocument();
    });

    it('displays rejection comments prominently with distinct styling', () => {
        render(<TransitionHistory transitions={mockTransitions} variant="task" />);

        // Find the rejection comment
        const rejectionComment = screen.getByText(/the design needs to match the brand guidelines/i);
        expect(rejectionComment).toBeInTheDocument();

        // The rejection item should have the comment visible
        const rejectionItem = rejectionComment.closest('[role="listitem"]');
        expect(rejectionItem).toBeInTheDocument();

        // Verify the revision_requested status is shown
        expect(within(rejectionItem!).getByText(/revision requested/i)).toBeInTheDocument();

        // Verify the category badge is shown for rejection feedback
        expect(screen.getByText(/design impact/i)).toBeInTheDocument();
    });

    it('displays user information with avatar fallback', () => {
        render(<TransitionHistory transitions={mockTransitions} variant="task" />);

        // Check that user names are displayed
        expect(screen.getAllByText('John Doe').length).toBeGreaterThan(0);
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    it('renders empty state when no transitions provided', () => {
        render(<TransitionHistory transitions={[]} variant="task" />);

        expect(screen.getByText(/no activity yet/i)).toBeInTheDocument();
    });

    describe('due-date changes', () => {
        it('renders a "changed due date" variant for a date → date change', () => {
            const transition = dueDateTransition({
                fromDueDate: '2024-05-30',
                toDueDate: '2024-06-06',
            });

            render(<TransitionHistory transitions={[transition]} variant="task" />);

            const item = screen.getByRole('listitem');
            expect(within(item).getByText('changed due date')).toBeInTheDocument();
            expect(within(item).getByText(/May 30/)).toBeInTheDocument();
            expect(within(item).getByText(/Jun 6/)).toBeInTheDocument();
            // Both dates are present, so the directional arrow is rendered
            expect(within(item).getByLabelText('changed to')).toBeInTheDocument();
        });

        it('renders a "set due date" variant for a null → date change', () => {
            const transition = dueDateTransition({
                fromDueDate: null,
                toDueDate: '2024-06-06',
            });

            render(<TransitionHistory transitions={[transition]} variant="task" />);

            const item = screen.getByRole('listitem');
            expect(within(item).getByText('set due date')).toBeInTheDocument();
            expect(within(item).getByText(/Jun 6/)).toBeInTheDocument();
            expect(within(item).queryByLabelText('changed to')).not.toBeInTheDocument();
        });

        it('renders a "cleared due date" variant for a date → null change', () => {
            const transition = dueDateTransition({
                fromDueDate: '2024-05-30',
                toDueDate: null,
            });

            render(<TransitionHistory transitions={[transition]} variant="task" />);

            const item = screen.getByRole('listitem');
            expect(within(item).getByText('cleared due date')).toBeInTheDocument();
            expect(within(item).getByText(/May 30/)).toBeInTheDocument();
            expect(within(item).queryByLabelText('changed to')).not.toBeInTheDocument();
        });

        it('renders the optional reason inline when present', () => {
            const transition = dueDateTransition({
                fromDueDate: '2024-05-30',
                toDueDate: '2024-06-06',
                comment: 'waiting on client assets',
            });

            render(<TransitionHistory transitions={[transition]} variant="task" />);

            expect(screen.getByText(/waiting on client assets/i)).toBeInTheDocument();
        });

        it('omits the reason text when no reason was given', () => {
            const transition = dueDateTransition({
                fromDueDate: '2024-05-30',
                toDueDate: '2024-06-06',
                comment: null,
            });

            render(<TransitionHistory transitions={[transition]} variant="task" />);

            // Only the date badges + label render; no extra "·" reason separator
            expect(screen.queryByText(/·/)).not.toBeInTheDocument();
        });

        it('interleaves a due-date change chronologically with status entries', () => {
            const transitions: StatusTransition[] = [
                mockTransitions[0],
                dueDateTransition({
                    id: 50,
                    fromDueDate: '2024-05-30',
                    toDueDate: '2024-06-06',
                    createdAt: '2024-01-15T12:00:00Z',
                }),
                mockTransitions[1],
            ];

            render(<TransitionHistory transitions={transitions} variant="task" />);

            const items = screen.getAllByRole('listitem');
            expect(items).toHaveLength(3);
            // The due-date change sits between the two status changes, preserving input order
            expect(items[1]).toHaveAttribute('data-transition-id', '50');
            expect(within(items[1]).getByText('changed due date')).toBeInTheDocument();
        });
    });
});

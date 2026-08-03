import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { RaciSelector, type RaciValue, type RaciUser } from '../raci-selector';
import {
    AssignmentConfirmationDialog,
    resolveAssignmentChange,
} from '../assignment-confirmation-dialog';

// Radix Select relies on these in jsdom.
window.HTMLElement.prototype.hasPointerCapture = vi.fn();
window.HTMLElement.prototype.releasePointerCapture = vi.fn();
window.HTMLElement.prototype.scrollIntoView = vi.fn();

const mockUsers: RaciUser[] = [
    { id: 1, name: 'Alice Johnson', avatar: undefined },
    { id: 2, name: 'Bob Smith', avatar: undefined },
    { id: 3, name: 'Carol Williams', avatar: undefined },
    { id: 4, name: 'David Brown', avatar: undefined },
];

describe('RaciSelector', () => {
    it('renders all four RACI role fields', () => {
        const onChange = vi.fn();
        const initialValue: RaciValue = {
            responsible_id: null,
            accountable_id: null,
            consulted_ids: [],
            informed_ids: [],
        };

        render(
            <RaciSelector
                value={initialValue}
                onChange={onChange}
                users={mockUsers}
                entityType="project"
            />
        );

        // Verify all four RACI role labels are present
        expect(screen.getByText('Responsible')).toBeInTheDocument();
        expect(screen.getByText('Accountable')).toBeInTheDocument();
        expect(screen.getByText('Consulted')).toBeInTheDocument();
        expect(screen.getByText('Informed')).toBeInTheDocument();

        // Verify all triggers are present
        expect(screen.getByTestId('raci-responsible-trigger')).toBeInTheDocument();
        expect(screen.getByTestId('raci-accountable-trigger')).toBeInTheDocument();
        expect(screen.getByTestId('raci-consulted-trigger')).toBeInTheDocument();
        expect(screen.getByTestId('raci-informed-trigger')).toBeInTheDocument();

        // Verify Accountable shows required indicator
        const accountableLabel = screen.getByText('Accountable').closest('label');
        expect(accountableLabel).toContainHTML('*');
    });

    it('supports multi-select for Consulted and Informed roles', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        const initialValue: RaciValue = {
            responsible_id: null,
            accountable_id: 1,
            consulted_ids: [],
            informed_ids: [],
        };

        render(
            <RaciSelector
                value={initialValue}
                onChange={onChange}
                users={mockUsers}
                entityType="work_order"
            />
        );

        // Open the Consulted multi-select popover
        const consultedTrigger = screen.getByTestId('raci-consulted-trigger');
        await user.click(consultedTrigger);

        // Select multiple users for Consulted
        const bobCheckbox = await screen.findByRole('checkbox', { name: /bob smith/i });
        await user.click(bobCheckbox);

        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({
                consulted_ids: [2],
            })
        );
    });

    it('requests confirmation with a null user when selecting None over an existing assignment', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        const onConfirmationRequired = vi.fn();
        const initialValue: RaciValue = {
            responsible_id: 2,
            accountable_id: 1,
            consulted_ids: [],
            informed_ids: [],
        };

        render(
            <RaciSelector
                value={initialValue}
                onChange={onChange}
                users={mockUsers}
                entityType="work_order"
                onConfirmationRequired={onConfirmationRequired}
            />
        );

        await user.click(screen.getByTestId('raci-responsible-trigger'));
        await user.click(await screen.findByRole('option', { name: /none/i }));

        expect(onConfirmationRequired).toHaveBeenCalledWith('responsible', 2, null);
        expect(onChange).not.toHaveBeenCalled();
    });

    it('clears the assignment directly when no confirmation handler is provided', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        const initialValue: RaciValue = {
            responsible_id: 2,
            accountable_id: 1,
            consulted_ids: [],
            informed_ids: [],
        };

        render(
            <RaciSelector
                value={initialValue}
                onChange={onChange}
                users={mockUsers}
                entityType="work_order"
            />
        );

        await user.click(screen.getByTestId('raci-responsible-trigger'));
        await user.click(await screen.findByRole('option', { name: /none/i }));

        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({ responsible_id: null })
        );
    });
});

describe('resolveAssignmentChange', () => {
    it('resolves a null user id to an unassigned slot', () => {
        expect(resolveAssignmentChange('responsible', null, mockUsers)).toEqual({
            role: 'Responsible',
            user: null,
        });
    });

    it('resolves a known user id to that user', () => {
        expect(resolveAssignmentChange('accountable', 2, mockUsers)).toEqual({
            role: 'Accountable',
            user: mockUsers[1],
        });
    });

    it('returns null for an unknown user id', () => {
        expect(resolveAssignmentChange('responsible', 999, mockUsers)).toBeNull();
    });
});

describe('AssignmentConfirmationDialog', () => {
    it('displays confirmation dialog when changing existing assignment', async () => {
        const user = userEvent.setup();
        const onConfirm = vi.fn();
        const onCancel = vi.fn();

        const currentAssignment = {
            role: 'Accountable' as const,
            user: { id: 1, name: 'Alice Johnson' },
        };
        const newAssignment = {
            role: 'Accountable' as const,
            user: { id: 2, name: 'Bob Smith' },
        };

        render(
            <AssignmentConfirmationDialog
                isOpen={true}
                currentAssignment={currentAssignment}
                newAssignment={newAssignment}
                onConfirm={onConfirm}
                onCancel={onCancel}
            />
        );

        // Verify dialog content shows the role in the title
        expect(screen.getByRole('heading', { name: /change accountable/i })).toBeInTheDocument();

        // Verify users are displayed
        expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
        expect(screen.getByText('Bob Smith')).toBeInTheDocument();

        // Confirm the change
        const confirmButton = screen.getByRole('button', { name: /confirm/i });
        await user.click(confirmButton);

        expect(onConfirm).toHaveBeenCalled();
    });

    it('allows cancelling the assignment change', async () => {
        const user = userEvent.setup();
        const onConfirm = vi.fn();
        const onCancel = vi.fn();

        const currentAssignment = {
            role: 'Responsible' as const,
            user: { id: 1, name: 'Alice Johnson' },
        };
        const newAssignment = {
            role: 'Responsible' as const,
            user: { id: 2, name: 'Bob Smith' },
        };

        render(
            <AssignmentConfirmationDialog
                isOpen={true}
                currentAssignment={currentAssignment}
                newAssignment={newAssignment}
                onConfirm={onConfirm}
                onCancel={onCancel}
            />
        );

        const cancelButton = screen.getByRole('button', { name: /cancel/i });
        await user.click(cancelButton);

        expect(onCancel).toHaveBeenCalled();
        expect(onConfirm).not.toHaveBeenCalled();
    });

    it('renders a removal when the new assignment has no user', async () => {
        const user = userEvent.setup();
        const onConfirm = vi.fn();

        render(
            <AssignmentConfirmationDialog
                isOpen={true}
                currentAssignment={{
                    role: 'Responsible' as const,
                    user: { id: 1, name: 'Alice Johnson' },
                }}
                newAssignment={{ role: 'Responsible' as const, user: null }}
                onConfirm={onConfirm}
                onCancel={vi.fn()}
            />
        );

        expect(
            screen.getByRole('heading', { name: /remove responsible/i })
        ).toBeInTheDocument();
        expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
        expect(screen.getByText('Unassigned')).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: /confirm/i }));

        expect(onConfirm).toHaveBeenCalled();
    });
});

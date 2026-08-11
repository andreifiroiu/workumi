import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateTaskDialog } from '../create-task-dialog';

// Radix Select primitives rely on these in jsdom.
window.HTMLElement.prototype.hasPointerCapture = vi.fn();
window.HTMLElement.prototype.releasePointerCapture = vi.fn();
window.HTMLElement.prototype.scrollIntoView = vi.fn();

const { postMock, formErrors } = vi.hoisted(() => ({
    postMock: vi.fn(),
    formErrors: { current: {} as Record<string, string> },
}));

// Mirrors @inertiajs/react's useForm, whose setData/clearErrors are memoized —
// unstable identities here would loop the dialog's re-seeding effect.
vi.mock('@inertiajs/react', async () => {
    const { useCallback, useState } = await import('react');

    return {
        useForm: (initial: Record<string, string>) => {
            const [data, setFormData] = useState(initial);

            const setData = useCallback(
                (key: string | Record<string, string>, value = '') => {
                    if (typeof key === 'object') {
                        setFormData(key);

                        return;
                    }

                    setFormData((previous) => ({ ...previous, [key]: value }));
                },
                [],
            );

            const clearErrors = useCallback(() => {}, []);

            return {
                data,
                setData,
                clearErrors,
                errors: formErrors.current,
                processing: false,
                post: postMock,
                reset: vi.fn(),
            };
        },
    };
});

const teamMembers = [
    { id: '1', name: 'Ada Lovelace' },
    { id: '2', name: 'Grace Hopper' },
];

const workOrders = [
    { id: '10', title: 'Brand refresh', status: 'active' },
    { id: '11', title: 'Shipped already', status: 'delivered' },
    { id: '12', title: 'Site rebuild', status: 'active' },
];

const renderDialog = (
    props: Partial<React.ComponentProps<typeof CreateTaskDialog>> = {},
) =>
    render(
        <CreateTaskDialog
            open
            onOpenChange={vi.fn()}
            teamMembers={teamMembers}
            {...props}
        />,
    );

describe('CreateTaskDialog', () => {
    beforeEach(() => {
        postMock.mockReset();
        formErrors.current = {};
        window.localStorage.clear();
    });

    it('offers an assignee picker listing every team member', async () => {
        const user = userEvent.setup();
        renderDialog();

        await user.click(screen.getByLabelText('Assign To'));

        expect(
            await screen.findByRole('option', { name: /Ada Lovelace/ }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('option', { name: /Grace Hopper/ }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('option', { name: 'Unassigned' }),
        ).toBeInTheDocument();
    });

    it('offers the same fields as the work order dialog', () => {
        renderDialog();

        expect(screen.getByLabelText('Title')).toBeInTheDocument();
        expect(screen.getByLabelText('Assign To')).toBeInTheDocument();
        expect(screen.getByLabelText('Due Date')).toBeInTheDocument();
        expect(screen.getByLabelText('Estimated Hours')).toBeInTheDocument();
        expect(
            screen.getByLabelText('Description (optional)'),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Tomorrow' }),
        ).toBeInTheDocument();
    });

    it('shows the work order picker only when work orders are supplied', async () => {
        const user = userEvent.setup();
        const { unmount } = renderDialog();

        expect(screen.queryByLabelText('Work Order')).not.toBeInTheDocument();
        unmount();

        renderDialog({ workOrders, initialWorkOrderId: '10' });
        await user.click(screen.getByLabelText('Work Order'));

        expect(
            await screen.findByRole('option', { name: 'Brand refresh' }),
        ).toBeInTheDocument();
        // Delivered work orders cannot take new tasks.
        expect(
            screen.queryByRole('option', { name: 'Shipped already' }),
        ).not.toBeInTheDocument();
    });

    it('shows a work order rejection even when the picker is hidden', () => {
        // The work order page fixes its parent and renders no picker, but the
        // server can still reject that parent — a team switch in another tab,
        // access revoked mid-session. With nowhere to render, the refusal reads
        // as a Create button that silently does nothing.
        formErrors.current = {
            workOrderId: 'The selected work order is invalid.',
        };
        renderDialog({ initialWorkOrderId: '10' });

        expect(screen.queryByLabelText('Work Order')).not.toBeInTheDocument();
        expect(
            screen.getByText('The selected work order is invalid.'),
        ).toBeInTheDocument();
    });

    it('surfaces errors that belong to no field on the form', () => {
        formErrors.current = { somethingElse: 'Task creation is unavailable.' };
        renderDialog();

        expect(
            screen.getByText('Task creation is unavailable.'),
        ).toBeInTheDocument();
    });

    it('re-seeds on reopen so a stale draft cannot leak into the next task', async () => {
        // The dialog outlives each opening: one instance serves every work order
        // row, so useForm's initial values go stale the moment the user picks a
        // different row.
        const user = userEvent.setup();
        const { rerender } = render(
            <CreateTaskDialog
                open
                onOpenChange={vi.fn()}
                teamMembers={teamMembers}
                workOrders={workOrders}
                initialWorkOrderId="10"
            />,
        );

        await user.type(screen.getByLabelText('Title'), 'Abandoned draft');
        expect(screen.getByLabelText('Title')).toHaveValue('Abandoned draft');

        const props = {
            onOpenChange: vi.fn(),
            teamMembers,
            workOrders,
            initialWorkOrderId: '12',
        };
        rerender(<CreateTaskDialog open={false} {...props} />);
        rerender(<CreateTaskDialog open {...props} />);

        expect(screen.getByLabelText('Title')).toHaveValue('');
        expect(screen.getByLabelText('Work Order')).toHaveTextContent(
            'Site rebuild',
        );
    });

    it('posts the chosen assignee to the task endpoint', async () => {
        const user = userEvent.setup();
        renderDialog({ initialWorkOrderId: '10' });

        await user.type(screen.getByLabelText('Title'), 'Draft the brief');
        await user.click(screen.getByLabelText('Assign To'));
        await user.click(
            await screen.findByRole('option', { name: /Grace Hopper/ }),
        );
        await user.click(screen.getByRole('button', { name: 'Create Task' }));

        expect(postMock).toHaveBeenCalledWith(
            '/work/tasks',
            expect.objectContaining({ preserveScroll: true }),
        );
    });
});

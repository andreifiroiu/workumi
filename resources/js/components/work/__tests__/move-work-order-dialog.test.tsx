import type { MoveDestinationProject } from '@/types/work';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MoveWorkOrderDialog } from '../move-work-order-dialog';

// Radix Select primitives rely on these in jsdom.
window.HTMLElement.prototype.hasPointerCapture = vi.fn();
window.HTMLElement.prototype.releasePointerCapture = vi.fn();
window.HTMLElement.prototype.scrollIntoView = vi.fn();

const { postMock, transformMock, formErrors } = vi.hoisted(() => ({
    postMock: vi.fn(),
    transformMock: vi.fn(),
    formErrors: { current: {} as Record<string, string> },
}));

/** The payload the dialog would have sent, via its captured transform. */
const submittedPayload = (data: Record<string, string>) =>
    transformMock.mock.calls.at(-1)![0](data);

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
                transform: transformMock,
                post: postMock,
                reset: vi.fn(),
            };
        },
    };
});

const destinations: MoveDestinationProject[] = [
    { id: '1', name: 'Current Project', isPrivate: false, lists: [] },
    {
        id: '2',
        name: 'Brand Refresh',
        isPrivate: false,
        lists: [
            { id: '10', name: 'Phase One' },
            { id: '11', name: 'Phase Two' },
        ],
    },
    { id: '3', name: 'Secret Work', isPrivate: true, lists: [] },
];

const renderDialog = (
    props: Partial<React.ComponentProps<typeof MoveWorkOrderDialog>> = {},
) =>
    render(
        <MoveWorkOrderDialog
            open
            onOpenChange={vi.fn()}
            workOrder={{ id: '7', title: 'Launch campaign' }}
            currentProjectId="1"
            destinations={destinations}
            {...props}
        />,
    );

const pickProject = async (
    user: ReturnType<typeof userEvent.setup>,
    name: RegExp,
) => {
    await user.click(screen.getByLabelText('Project'));
    await user.click(await screen.findByRole('option', { name }));
};

describe('MoveWorkOrderDialog', () => {
    beforeEach(() => {
        postMock.mockReset();
        transformMock.mockReset();
        formErrors.current = {};
    });

    it('does not offer the project the work order is already in', async () => {
        const user = userEvent.setup();
        renderDialog();

        await user.click(screen.getByLabelText('Project'));

        expect(
            await screen.findByRole('option', { name: /Brand Refresh/ }),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('option', { name: /Current Project/ }),
        ).not.toBeInTheDocument();
    });

    it('offers the chosen project lists, and no picker when it has none', async () => {
        const user = userEvent.setup();
        renderDialog();

        // A project with no lists would give a one-option picker.
        expect(screen.queryByLabelText('List')).not.toBeInTheDocument();

        await pickProject(user, /Brand Refresh/);
        await user.click(screen.getByLabelText('List'));

        expect(
            await screen.findByRole('option', { name: 'Phase One' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('option', { name: 'Ungrouped' }),
        ).toBeInTheDocument();
    });

    it('posts the destination and list to the move endpoint', async () => {
        const user = userEvent.setup();
        renderDialog();

        await pickProject(user, /Brand Refresh/);
        await user.click(screen.getByLabelText('List'));
        await user.click(
            await screen.findByRole('option', { name: 'Phase Two' }),
        );
        await user.click(screen.getByRole('button', { name: 'Move' }));

        expect(postMock).toHaveBeenCalledWith(
            '/work/work-orders/7/move',
            expect.objectContaining({ preserveScroll: true }),
        );
        expect(
            submittedPayload({ projectId: '2', workOrderListId: '11' }),
        ).toEqual({ projectId: '2', workOrderListId: '11' });
    });

    it('sends no list when the work order is left ungrouped', async () => {
        const user = userEvent.setup();
        renderDialog();

        await pickProject(user, /Brand Refresh/);
        await user.click(screen.getByRole('button', { name: 'Move' }));

        // The sentinel is a Radix workaround; the endpoint wants no list.
        expect(
            submittedPayload({ projectId: '2', workOrderListId: 'ungrouped' }),
        ).toEqual({ projectId: '2', workOrderListId: '' });
    });

    it('resets the list when the project changes', async () => {
        // A list cannot survive the move to a project that does not own it.
        const user = userEvent.setup();
        renderDialog();

        await pickProject(user, /Brand Refresh/);
        await user.click(screen.getByLabelText('List'));
        await user.click(
            await screen.findByRole('option', { name: 'Phase One' }),
        );
        expect(screen.getByLabelText('List')).toHaveTextContent('Phase One');

        await pickProject(user, /Secret Work/);
        await pickProject(user, /Brand Refresh/);

        expect(screen.getByLabelText('List')).toHaveTextContent('Ungrouped');
    });

    it('warns that a private destination hides the work order', async () => {
        const user = userEvent.setup();
        renderDialog();

        expect(screen.queryByText(/is private/)).not.toBeInTheDocument();

        await pickProject(user, /Secret Work/);

        expect(screen.getByText(/Secret Work is private/)).toBeInTheDocument();
    });

    it('cannot be submitted before a destination is chosen', () => {
        renderDialog();

        expect(screen.getByRole('button', { name: 'Move' })).toBeDisabled();
    });

    it('surfaces an error that belongs to no field on the form', () => {
        formErrors.current = { workOrder: 'This work order cannot be moved.' };
        renderDialog();

        expect(
            screen.getByText('This work order cannot be moved.'),
        ).toBeInTheDocument();
    });

    it('shows a list rejection even when the picker is hidden', () => {
        // The picker is hidden for a project with no lists, but the server can
        // still reject one — an error with nowhere to render reads as a dead
        // Move button.
        formErrors.current = {
            workOrderListId:
                'The selected list does not belong to this project.',
        };
        renderDialog();

        expect(screen.queryByLabelText('List')).not.toBeInTheDocument();
        expect(
            screen.getByText(
                'The selected list does not belong to this project.',
            ),
        ).toBeInTheDocument();
    });

    it('explains itself when there is nowhere to move to', () => {
        // Two of the three call sites cannot gate the menu item, so an empty
        // picker over a permanently disabled button has to say why.
        renderDialog({
            destinations: [
                {
                    id: '1',
                    name: 'Current Project',
                    isPrivate: false,
                    lists: [],
                },
            ],
        });

        expect(
            screen.getByText(
                /no other project you can move this work order into/,
            ),
        ).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Move' })).toBeDisabled();
    });
});

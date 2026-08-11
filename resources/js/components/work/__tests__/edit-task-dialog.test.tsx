import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EditTaskDialog } from '../edit-task-dialog';

// Radix Select primitives rely on these in jsdom.
window.HTMLElement.prototype.hasPointerCapture = vi.fn();
window.HTMLElement.prototype.releasePointerCapture = vi.fn();
window.HTMLElement.prototype.scrollIntoView = vi.fn();

const { patchMock, transformMock, formErrors } = vi.hoisted(() => ({
    patchMock: vi.fn(),
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
                patch: patchMock,
                reset: vi.fn(),
            };
        },
    };
});

const teamMembers = [
    { id: '1', name: 'Ada Lovelace' },
    { id: '2', name: 'Grace Hopper' },
];

const availableAgents = [{ id: '7', name: 'Research Bot' }];

const task = {
    id: '9',
    title: 'Draft the brief',
    description: 'A first pass',
    assignedToId: '1',
    assignedAgentId: null,
    dueDate: '2025-03-04',
    estimatedHours: 4,
};

const renderDialog = (
    props: Partial<React.ComponentProps<typeof EditTaskDialog>> = {},
) =>
    render(
        <EditTaskDialog
            open
            onOpenChange={vi.fn()}
            task={task}
            teamMembers={teamMembers}
            availableAgents={availableAgents}
            {...props}
        />,
    );

describe('EditTaskDialog', () => {
    beforeEach(() => {
        patchMock.mockReset();
        transformMock.mockReset();
        formErrors.current = {};
        window.localStorage.clear();
    });

    it('seeds every field from the task it was opened for', () => {
        renderDialog();

        expect(screen.getByLabelText('Title')).toHaveValue('Draft the brief');
        expect(screen.getByLabelText('Assigned To')).toHaveTextContent(
            'Ada Lovelace',
        );
        expect(screen.getByLabelText('Estimated Hours')).toHaveValue(4);
        expect(screen.getByLabelText('Due Date')).toHaveValue('2025-03-04');
        expect(screen.getByLabelText('Description')).toHaveValue(
            'A first pass',
        );
    });

    it('offers AI agents alongside team members', async () => {
        const user = userEvent.setup();
        renderDialog();

        await user.click(screen.getByLabelText('Assigned To'));

        expect(
            await screen.findByRole('option', { name: /Grace Hopper/ }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('option', { name: /Research Bot/ }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('option', { name: 'Unassigned' }),
        ).toBeInTheDocument();
    });

    it('re-seeds on reopen so the previous task cannot leak into the next', () => {
        // One instance serves every row of the work order's task list, so
        // useForm's initial values go stale the moment another row is opened.
        const props = {
            onOpenChange: vi.fn(),
            teamMembers,
            availableAgents,
        };
        const { rerender } = render(
            <EditTaskDialog open task={task} {...props} />,
        );

        const nextTask = {
            ...task,
            id: '10',
            title: 'Review the brief',
            assignedToId: null,
            assignedAgentId: '7',
        };
        rerender(<EditTaskDialog open={false} task={nextTask} {...props} />);
        rerender(<EditTaskDialog open task={nextTask} {...props} />);

        expect(screen.getByLabelText('Title')).toHaveValue('Review the brief');
        expect(screen.getByLabelText('Assigned To')).toHaveTextContent(
            'Research Bot',
        );
    });

    it('patches the task, unpacking the picker into the two assignment fields', async () => {
        const user = userEvent.setup();
        renderDialog();

        await user.click(screen.getByLabelText('Assigned To'));
        await user.click(
            await screen.findByRole('option', { name: /Research Bot/ }),
        );
        await user.click(screen.getByRole('button', { name: 'Save' }));

        expect(patchMock).toHaveBeenCalledWith(
            '/work/tasks/9',
            expect.objectContaining({ preserveScroll: true }),
        );
        expect(submittedPayload({ assignment: 'agent:7' })).toMatchObject({
            assignedToId: null,
            assignedAgentId: '7',
        });
    });

    it('asks for a reason only once the due date changes, and sends it', async () => {
        const user = userEvent.setup();
        renderDialog();

        expect(
            screen.queryByLabelText(/Reason for due date change/),
        ).not.toBeInTheDocument();

        await user.clear(screen.getByLabelText('Due Date'));
        await user.type(screen.getByLabelText('Due Date'), '2025-03-11');
        await user.type(
            await screen.findByLabelText(/Reason for due date change/),
            'client assets late',
        );
        await user.click(screen.getByRole('button', { name: 'Save' }));

        // The transform derives everything from the data it is handed, so the
        // payload must carry the edited date the way the real form does.
        expect(
            submittedPayload({
                assignment: 'user:1',
                due_date: '2025-03-11',
                reason: 'client assets late',
            }),
        ).toMatchObject({ reason: 'client assets late' });
    });

    it('sends no reason when the due date was left alone', async () => {
        const user = userEvent.setup();
        renderDialog();

        await user.click(screen.getByRole('button', { name: 'Save' }));

        expect(
            submittedPayload({
                assignment: 'user:1',
                due_date: task.dueDate,
                reason: 'stale text',
            }),
        ).toMatchObject({ reason: null });
    });

    it('keeps what the user typed when the page re-renders under it', () => {
        // A rejected save re-renders the page with fresh props while the dialog
        // stays open; re-seeding on the new object identity would wipe the edit.
        const { rerender } = render(
            <EditTaskDialog
                open
                onOpenChange={vi.fn()}
                task={task}
                teamMembers={teamMembers}
            />,
        );

        fireEvent.change(screen.getByLabelText('Title'), {
            target: { value: 'Half-typed title' },
        });
        rerender(
            <EditTaskDialog
                open
                onOpenChange={vi.fn()}
                task={{ ...task }}
                teamMembers={teamMembers}
            />,
        );

        expect(screen.getByLabelText('Title')).toHaveValue('Half-typed title');
    });

    it('surfaces an error on a field that has no input of its own', () => {
        // The endpoint rejects assignment, due date and hours too, and an error
        // with nowhere to land reads as a Save button that does nothing.
        formErrors.current = {
            estimatedHours: 'Estimated hours must be at least 0.',
        };
        renderDialog();

        expect(
            screen.getByText('Estimated hours must be at least 0.'),
        ).toBeInTheDocument();
    });
});

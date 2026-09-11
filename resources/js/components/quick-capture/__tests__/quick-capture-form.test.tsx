import type {
    CaptureOptions,
    QuickCaptureFormData,
    QuickCaptureType,
} from '@/types/quick-capture';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { NONE, QuickCaptureForm } from '../quick-capture-form';

// Radix Select primitives rely on these in jsdom.
window.HTMLElement.prototype.hasPointerCapture = vi.fn();
window.HTMLElement.prototype.releasePointerCapture = vi.fn();
window.HTMLElement.prototype.scrollIntoView = vi.fn();

function makeOptions(overrides: Partial<CaptureOptions> = {}): CaptureOptions {
    return {
        parties: [{ id: '7', name: 'Acme Corp' }],
        projects: [{ id: '1', name: 'Acme Rebrand' }],
        workOrders: [
            { id: '42', title: 'Homepage Redesign', projectId: '1' },
            { id: '43', title: 'Brand Guidelines', projectId: '2' },
        ],
        ...overrides,
    };
}

function makeData(
    type: QuickCaptureType,
    overrides: Partial<QuickCaptureFormData> = {},
): QuickCaptureFormData {
    return {
        type,
        title: '',
        description: '',
        partyId: '',
        projectId: type === 'note' ? NONE : '',
        workOrderId: type === 'note' ? NONE : '',
        dueDate: '',
        priority: 'medium',
        ...overrides,
    };
}

function renderForm(
    data: QuickCaptureFormData,
    options: CaptureOptions = makeOptions(),
) {
    return render(
        <QuickCaptureForm
            data={data}
            errors={{}}
            options={options}
            isLoadingOptions={false}
            onChange={vi.fn()}
        />,
    );
}

describe('QuickCaptureForm', () => {
    it('asks for a work order when capturing a task', () => {
        renderForm(makeData('task'));

        expect(screen.getByText('Work order')).toBeInTheDocument();
        expect(screen.getByLabelText('Task title')).toBeInTheDocument();
    });

    it('asks for a project when capturing a work order', () => {
        renderForm(makeData('work_order'));

        expect(screen.getByText('Project')).toBeInTheDocument();
        expect(screen.getByText('Priority')).toBeInTheDocument();
    });

    it('asks for a client when capturing a project', () => {
        renderForm(makeData('project'));

        expect(screen.getByText('Client')).toBeInTheDocument();
        expect(screen.getByText('Target end date')).toBeInTheDocument();
    });

    /** A note is something to remember, not something with a deadline. */
    it('makes the parent optional for a note and drops the due date', () => {
        renderForm(makeData('note'));

        expect(screen.getByText('Project (optional)')).toBeInTheDocument();
        expect(screen.getByText('Work order (optional)')).toBeInTheDocument();
        expect(screen.queryByText('Due date')).not.toBeInTheDocument();
    });

    it('labels the body field as the note itself', () => {
        renderForm(makeData('note'));

        expect(screen.getByLabelText('Note')).toBeInTheDocument();
    });
});

describe('QuickCaptureForm parent selection', () => {
    /**
     * Regression: choosing a project also clears the work order. Done as two
     * calls, the second overwrote the first from the same render's data and the
     * project was silently dropped, so Create failed validation.
     */
    it('changes the project and clears the work order in a single update', async () => {
        const onChange = vi.fn();
        const user = userEvent.setup();

        render(
            <QuickCaptureForm
                data={makeData('work_order', { workOrderId: '42' })}
                errors={{}}
                options={makeOptions()}
                isLoadingOptions={false}
                onChange={onChange}
            />,
        );

        await user.click(screen.getByLabelText('Project'));
        await user.click(screen.getByRole('option', { name: 'Acme Rebrand' }));

        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange).toHaveBeenCalledWith({
            projectId: '1',
            workOrderId: NONE,
        });
    });

    it('offers only the work orders belonging to the chosen project', async () => {
        const user = userEvent.setup();
        renderForm(makeData('task', { projectId: '1' }));

        await user.click(screen.getByLabelText('Work order'));

        expect(
            screen.getByRole('option', { name: 'Homepage Redesign' }),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('option', { name: 'Brand Guidelines' }),
        ).not.toBeInTheDocument();
    });
});

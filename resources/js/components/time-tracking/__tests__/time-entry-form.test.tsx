import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { TimeEntryForm } from '../time-entry-form';

const mockRouterPost = vi.fn();
const mockRouterPatch = vi.fn();

vi.mock('@inertiajs/react', () => ({
    router: {
        post: (...args: unknown[]) => mockRouterPost(...args),
        patch: (...args: unknown[]) => mockRouterPatch(...args),
    },
}));

describe('TimeEntryForm', () => {
    beforeEach(() => {
        mockRouterPost.mockReset();
        mockRouterPatch.mockReset();
    });

    it('renders all required form fields', () => {
        render(<TimeEntryForm />);

        expect(screen.getByLabelText(/hours/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/date/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/note/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/billable/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /log time/i })).toBeInTheDocument();
    });

    it('submits form with valid data', async () => {
        const onSuccess = vi.fn();

        mockRouterPost.mockImplementation((_url, _data, options) => {
            options?.onSuccess?.();
            options?.onFinish?.();
        });

        render(<TimeEntryForm taskId={42} onSuccess={onSuccess} />);

        // Fill in hours using fireEvent for more reliable number input
        const hoursInput = screen.getByLabelText(/hours/i);
        fireEvent.change(hoursInput, { target: { value: '2.5' } });

        // Submit the form
        const form = screen.getByRole('form', { name: /time entry form/i });
        fireEvent.submit(form);

        // Wait for router.post to be called
        await waitFor(() => {
            expect(mockRouterPost).toHaveBeenCalled();
        });

        // Verify the call arguments (taskId is camelCase per backend validation)
        expect(mockRouterPost).toHaveBeenCalledWith(
            '/work/time-entries',
            expect.objectContaining({
                taskId: 42,
                hours: 2.5,
                is_billable: true,
            }),
            expect.any(Object)
        );

        expect(onSuccess).toHaveBeenCalled();
    });

    it('validates hours within 0.01 - 24 range', async () => {
        render(<TimeEntryForm taskId={1} />);

        // Type invalid hours value
        const hoursInput = screen.getByLabelText(/hours/i);
        fireEvent.change(hoursInput, { target: { value: '25' } });

        // Submit the form
        const form = screen.getByRole('form', { name: /time entry form/i });
        fireEvent.submit(form);

        // Validation error should appear
        await waitFor(() => {
            expect(screen.getByText(/hours must be 24 or less/i)).toBeInTheDocument();
        });

        // Form should not be submitted
        expect(mockRouterPost).not.toHaveBeenCalled();
    });

    it('resets form after successful submission', async () => {
        mockRouterPost.mockImplementation((_url, _data, options) => {
            options?.onSuccess?.();
            options?.onFinish?.();
        });

        render(<TimeEntryForm taskId={42} />);

        // Fill in form fields
        const noteInput = screen.getByLabelText(/note/i) as HTMLTextAreaElement;
        const hoursInput = screen.getByLabelText(/hours/i);

        fireEvent.change(hoursInput, { target: { value: '3.5' } });
        fireEvent.change(noteInput, { target: { value: 'Test note content' } });

        // Submit the form
        const form = screen.getByRole('form', { name: /time entry form/i });
        fireEvent.submit(form);

        // Wait for success message
        await waitFor(() => {
            expect(screen.getByRole('status')).toHaveTextContent(/time entry logged successfully/i);
        });

        // Note input should be reset
        expect(noteInput.value).toBe('');
    });
});

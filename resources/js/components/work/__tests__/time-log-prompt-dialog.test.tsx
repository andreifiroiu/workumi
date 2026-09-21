import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TimeLogPromptDialog } from '../time-log-prompt-dialog';

const mockRouterPost = vi.fn();

vi.mock('@inertiajs/react', () => ({
    router: {
        post: (...args: unknown[]) => mockRouterPost(...args),
        patch: vi.fn(),
    },
}));

const prompt = {
    taskId: '42',
    taskTitle: 'Write the report',
    estimatedHours: 2.5,
};

describe('TimeLogPromptDialog', () => {
    beforeEach(() => {
        mockRouterPost.mockReset();
    });

    it('stays shut when there is nothing to ask', () => {
        render(<TimeLogPromptDialog prompt={null} onDismiss={vi.fn()} />);

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('names the task and pre-fills the hours with its estimate', () => {
        render(<TimeLogPromptDialog prompt={prompt} onDismiss={vi.fn()} />);

        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('Write the report')).toBeInTheDocument();
        expect(screen.getByLabelText(/hours/i)).toHaveValue(2.5);
    });

    it('leaves the hours empty for an unestimated task', () => {
        render(
            <TimeLogPromptDialog
                prompt={{ ...prompt, estimatedHours: null }}
                onDismiss={vi.fn()}
            />,
        );

        expect(screen.getByLabelText(/hours/i)).toHaveValue(null);
    });

    it('logs the hours against the task and then dismisses', async () => {
        const onDismiss = vi.fn();

        mockRouterPost.mockImplementation((_url, _data, options) => {
            options?.onSuccess?.();
            options?.onFinish?.();
        });

        render(<TimeLogPromptDialog prompt={prompt} onDismiss={onDismiss} />);

        fireEvent.change(screen.getByLabelText(/hours/i), {
            target: { value: '3' },
        });
        fireEvent.submit(
            screen.getByRole('form', { name: /time entry form/i }),
        );

        await waitFor(() => {
            expect(mockRouterPost).toHaveBeenCalledWith(
                '/work/time-entries',
                expect.objectContaining({ taskId: '42', hours: 3 }),
                expect.anything(),
            );
        });

        expect(onDismiss).toHaveBeenCalled();
    });

    it('surfaces a server rejection instead of silently doing nothing', async () => {
        const onDismiss = vi.fn();

        mockRouterPost.mockImplementation((_url, _data, options) => {
            options?.onError?.({ taskId: 'This action is unauthorized.' });
            options?.onFinish?.();
        });

        render(<TimeLogPromptDialog prompt={prompt} onDismiss={onDismiss} />);

        fireEvent.change(screen.getByLabelText(/hours/i), {
            target: { value: '3' },
        });
        fireEvent.submit(
            screen.getByRole('form', { name: /time entry form/i }),
        );

        await waitFor(() => {
            expect(screen.getByRole('alert')).toHaveTextContent(
                /this action is unauthorized/i,
            );
        });
        expect(onDismiss).not.toHaveBeenCalled();
    });

    it('dismisses without logging anything when closed', () => {
        const onDismiss = vi.fn();

        render(<TimeLogPromptDialog prompt={prompt} onDismiss={onDismiss} />);

        fireEvent.click(
            screen.getByRole('button', { name: /close without logging/i }),
        );

        expect(onDismiss).toHaveBeenCalledTimes(1);
        expect(mockRouterPost).not.toHaveBeenCalled();
    });
});

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { KanbanTasksView } from '../kanban-tasks-view';
import type { Task } from '@/types/work';

const mockIsMobile = vi.fn(() => false);

vi.mock('@/hooks/use-mobile', () => ({
    useIsMobile: () => mockIsMobile(),
}));

vi.mock('@inertiajs/react', () => ({
    router: { reload: vi.fn(), post: vi.fn(), patch: vi.fn() },
    Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/lib/csrf', () => ({
    csrfHeaders: () => ({ 'Content-Type': 'application/json' }),
}));

// Stubbed so the assertions are about where the dialog is mounted and what reaches it,
// not about its internals — those are covered in time-log-prompt-dialog.test.tsx.
vi.mock('@/components/work/time-log-prompt-dialog', () => ({
    TimeLogPromptDialog: ({
        prompt,
    }: {
        prompt: { taskTitle: string } | null;
    }) => (
        <div data-testid="time-log-prompt" data-task-title={prompt?.taskTitle}>
            {prompt ? 'prompting' : 'idle'}
        </div>
    ),
}));

const task = {
    id: '1',
    title: 'Write the report',
    description: null,
    status: 'in_progress',
    dueDate: null,
    assignedToId: null,
    assignedToName: 'Unassigned',
    estimatedHours: 2,
    actualHours: 0,
    checklistItems: [],
    isBlocked: false,
    positionInWorkOrder: 1,
    workOrderId: '1',
    workOrderTitle: 'WO',
    projectId: '1',
    projectName: 'Project',
} as unknown as Task;

describe('KanbanTasksView time-log prompt', () => {
    beforeEach(() => {
        vi.unstubAllGlobals();
        mockIsMobile.mockReturnValue(false);
    });

    it('passes the prompt to the dialog after mark-done closes a task', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({
                    timeLogPrompt: {
                        taskId: '1',
                        taskTitle: 'Write the report',
                        estimatedHours: 2,
                    },
                    task: { status: 'done' },
                }),
            }),
        );

        render(<KanbanTasksView tasks={[task]} />);

        fireEvent.click(screen.getByRole('button', { name: /mark.*done/i }));

        await waitFor(() => {
            expect(screen.getByTestId('time-log-prompt')).toHaveAttribute(
                'data-task-title',
                'Write the report',
            );
        });
    });

    it('leaves the dialog idle when the task already had hours logged', async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ timeLogPrompt: null, task: { status: 'done' } }),
        });
        vi.stubGlobal('fetch', fetchMock);

        render(<KanbanTasksView tasks={[task]} />);

        fireEvent.click(screen.getByRole('button', { name: /mark.*done/i }));

        await waitFor(() => expect(fetchMock).toHaveBeenCalled());
        expect(screen.getByTestId('time-log-prompt')).toHaveTextContent('idle');
    });

    // The mobile tree returns early, so a dialog mounted only in the desktop tree would
    // capture the prompt and never show it.
    it('mounts the dialog in the mobile tree as well', () => {
        mockIsMobile.mockReturnValue(true);

        render(<KanbanTasksView tasks={[task]} />);

        expect(screen.getByTestId('time-log-prompt')).toBeInTheDocument();
    });
});

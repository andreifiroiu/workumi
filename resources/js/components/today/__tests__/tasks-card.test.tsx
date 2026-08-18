import type { TodayTask } from '@/types/today';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TasksCard } from '../tasks-card';

function makeTask(overrides: Partial<TodayTask> = {}): TodayTask {
    return {
        id: '1',
        title: 'Draft the homepage copy',
        description: 'Write the first pass of the hero section.',
        status: 'todo',
        priority: 'high',
        dueDate: '2026-01-08T12:00:00Z',
        isOverdue: false,
        isDueToday: true,
        assignedTo: 'Andrei',
        workOrderId: '42',
        workOrderTitle: 'Homepage Redesign',
        projectTitle: 'Acme Rebrand',
        estimatedHours: 4,
        ...overrides,
    };
}

describe('TasksCard', () => {
    it('shows both the project and the work order for a task', () => {
        render(<TasksCard tasks={[makeTask()]} />);

        expect(screen.getByText('Acme Rebrand')).toBeInTheDocument();
        expect(screen.getByText('Homepage Redesign')).toBeInTheDocument();
    });

    it('omits the work order when the task has none', () => {
        render(<TasksCard tasks={[makeTask({ workOrderTitle: '' })]} />);

        expect(screen.getByText('Acme Rebrand')).toBeInTheDocument();
        expect(screen.queryByText('Homepage Redesign')).not.toBeInTheDocument();
    });

    it('drops a missing project without leaving a dangling separator', () => {
        render(<TasksCard tasks={[makeTask({ projectTitle: '' })]} />);

        expect(screen.getByText('Homepage Redesign')).toBeInTheDocument();
        expect(screen.getAllByText('•')).toHaveLength(1);
    });
});

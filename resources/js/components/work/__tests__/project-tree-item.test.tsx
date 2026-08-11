import type { Project, Task } from '@/types/work';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ProjectTreeItem } from '../project-tree-item';

// Radix dropdown primitives rely on these in jsdom.
window.HTMLElement.prototype.hasPointerCapture = vi.fn();
window.HTMLElement.prototype.releasePointerCapture = vi.fn();
window.HTMLElement.prototype.scrollIntoView = vi.fn();

vi.mock('@inertiajs/react', () => ({
    Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
        <a href={href}>{children}</a>
    ),
    router: { delete: vi.fn(), patch: vi.fn(), post: vi.fn() },
}));

// The dialog has its own tests; here only the wiring matters.
vi.mock('../edit-task-dialog', () => ({
    EditTaskDialog: ({ open, task }: { open: boolean; task: Task }) =>
        open ? <div data-testid="edit-task-dialog">{task.title}</div> : null,
}));

const teamMembers = [{ id: '1', name: 'Ada Lovelace' }];

const task: Task = {
    id: '5',
    title: 'Draft the brief',
    description: null,
    workOrderId: 'wo-1',
    workOrderTitle: 'Brand refresh',
    projectId: 'proj-1',
    projectName: 'Acme',
    assignedToId: '1',
    assignedToName: 'Ada Lovelace',
    assignedAgentId: null,
    assignedAgentName: null,
    status: 'todo',
    dueDate: null,
    estimatedHours: 2,
    actualHours: 0,
    checklistItems: [],
    dependencies: [],
    isBlocked: false,
};

const project: Project = {
    id: 'proj-1',
    name: 'Acme Project',
    description: null,
    partyId: 'party-1',
    partyName: 'Acme',
    ownerId: 'user-1',
    ownerName: 'Owner',
    status: 'active',
    startDate: '2026-01-01',
    targetEndDate: null,
    budgetHours: null,
    budgetType: null,
    budgetCost: null,
    actualHours: 0,
    actualCost: null,
    actualRevenue: null,
    progress: 0,
    tags: [],
    workOrderLists: [],
    ungroupedWorkOrders: [
        {
            id: 'wo-1',
            title: 'Brand refresh',
            status: 'active',
            priority: 'medium',
            dueDate: null,
            assignedToName: 'Ada Lovelace',
            tasksCount: 1,
            completedTasksCount: 0,
            positionInList: 0,
        },
    ],
};

describe('ProjectTreeItem', () => {
    it('edits a task in place rather than sending the user to its page', async () => {
        const user = userEvent.setup();
        render(
            <ProjectTreeItem
                project={project}
                workOrders={[]}
                tasks={[task]}
                teamMembers={teamMembers}
                onCreateWorkOrder={vi.fn()}
                onCreateTask={vi.fn()}
            />,
        );

        // Work order rows start collapsed, so the task is behind the chevron —
        // the only unlabelled button on the row.
        const workOrderRow = screen
            .getByRole('link', { name: /Brand refresh/ })
            .closest('div.group')!;
        await user.click(
            within(workOrderRow as HTMLElement)
                .getAllByRole('button')
                .find((button) => !button.getAttribute('title'))!,
        );
        const taskRow = screen
            .getByRole('link', { name: /Draft the brief/ })
            .closest('div.group')!;
        await user.click(
            within(taskRow as HTMLElement).getByRole('button', {
                name: 'More options',
            }),
        );
        await user.click(await screen.findByText('Edit Task'));

        expect(screen.getByTestId('edit-task-dialog')).toHaveTextContent(
            'Draft the brief',
        );
    });

    it('hands the work order and its project to the page move handler', async () => {
        // The dialog lives on the page, one instance for the whole tree.
        const user = userEvent.setup();
        const onMoveWorkOrder = vi.fn();
        render(
            <ProjectTreeItem
                project={project}
                workOrders={[]}
                tasks={[task]}
                teamMembers={teamMembers}
                onCreateWorkOrder={vi.fn()}
                onCreateTask={vi.fn()}
                onMoveWorkOrder={onMoveWorkOrder}
            />,
        );

        const workOrderRow = screen
            .getByRole('link', { name: /Brand refresh/ })
            .closest('div.group')!;
        await user.click(
            within(workOrderRow as HTMLElement).getByRole('button', {
                name: 'More options',
            }),
        );
        await user.click(await screen.findByText('Move to Project…'));

        expect(onMoveWorkOrder).toHaveBeenCalledWith(
            project.ungroupedWorkOrders[0],
            project.id,
        );
    });
});

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkOrderListItem } from '../work-order-list-item';
import type { WorkOrderInList } from '@/types/work';

// Radix dropdown/submenu primitives rely on these in jsdom.
window.HTMLElement.prototype.hasPointerCapture = vi.fn();
window.HTMLElement.prototype.releasePointerCapture = vi.fn();
window.HTMLElement.prototype.scrollIntoView = vi.fn();

const routerMock = {
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
};

vi.mock('@inertiajs/react', () => ({
    Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
        <a href={href}>{children}</a>
    ),
    router: {
        post: (...args: unknown[]) => routerMock.post(...args),
        patch: (...args: unknown[]) => routerMock.patch(...args),
        delete: (...args: unknown[]) => routerMock.delete(...args),
    },
}));

vi.mock('@dnd-kit/sortable', () => ({
    useSortable: () => ({
        attributes: {},
        listeners: {},
        setNodeRef: vi.fn(),
        transform: null,
        transition: undefined,
        isDragging: false,
    }),
}));

vi.mock('@dnd-kit/utilities', () => ({
    CSS: { Transform: { toString: () => undefined } },
}));

const workOrder: WorkOrderInList = {
    id: 'wo-1',
    title: 'Build landing page',
    status: 'active',
    priority: 'medium',
    dueDate: null,
    assignedToName: 'Jane Doe',
    tasksCount: 2,
    completedTasksCount: 1,
    positionInList: 0,
};

async function openMenu() {
    const user = userEvent.setup();
    const trigger = screen.getAllByRole('button').at(-1)!;
    await user.click(trigger);
    return user;
}

describe('WorkOrderListItem dropdown actions', () => {
    beforeEach(() => {
        routerMock.post.mockClear();
        routerMock.patch.mockClear();
    });

    it('exposes Change Status and Mark as Delivered & Archive options', async () => {
        render(<WorkOrderListItem workOrder={workOrder} />);

        await openMenu();

        expect(await screen.findByText('Change Status')).toBeInTheDocument();
        expect(screen.getByText('Mark as Delivered & Archive')).toBeInTheDocument();
    });

    it('posts to the deliver-and-archive endpoint', async () => {
        render(<WorkOrderListItem workOrder={workOrder} />);

        const user = await openMenu();
        await user.click(await screen.findByText('Mark as Delivered & Archive'));

        expect(routerMock.post).toHaveBeenCalledWith(
            '/work/work-orders/wo-1/deliver-and-archive',
            {},
            { preserveScroll: true }
        );
    });

    it('lists the selectable statuses under Change Status', async () => {
        render(<WorkOrderListItem workOrder={workOrder} />);

        const user = await openMenu();
        await user.click(await screen.findByText('Change Status'));

        // Mirrors the statuses accepted by WorkOrderController@updateStatus.
        for (const label of ['Draft', 'Active', 'In Review', 'Approved', 'Delivered']) {
            expect(await screen.findByRole('menuitemradio', { name: label })).toBeInTheDocument();
        }
    });

    it('hides status actions for archived work orders', async () => {
        render(<WorkOrderListItem workOrder={{ ...workOrder, status: 'archived' }} />);

        await openMenu();

        expect(screen.queryByText('Change Status')).not.toBeInTheDocument();
        expect(screen.queryByText('Mark as Delivered & Archive')).not.toBeInTheDocument();
        expect(await screen.findByText('Unarchive')).toBeInTheDocument();
    });
});

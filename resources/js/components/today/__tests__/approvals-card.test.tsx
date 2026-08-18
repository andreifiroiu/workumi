import type { TodayApproval } from '@/types/today';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AnchorHTMLAttributes } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ApprovalsCard } from '../approvals-card';

vi.mock('@inertiajs/react', () => ({
    Link: ({
        href,
        children,
        ...props
    }: AnchorHTMLAttributes<HTMLAnchorElement>) => (
        <a href={href} {...props}>
            {children}
        </a>
    ),
}));

function makeApproval(overrides: Partial<TodayApproval> = {}): TodayApproval {
    return {
        id: '1',
        type: 'draft',
        title: 'Approve the delivery plan',
        description: 'The PM copilot drafted a plan for this work order.',
        createdBy: 'PM Copilot',
        createdAt: '2026-01-05T12:00:00Z',
        workOrderId: '42',
        workOrderTitle: 'Homepage Redesign',
        projectTitle: 'Acme Rebrand',
        priority: 'high',
        dueDate: '2026-01-08T12:00:00Z',
        ...overrides,
    };
}

describe('ApprovalsCard', () => {
    it('links an approval to its work order detail page', () => {
        render(<ApprovalsCard approvals={[makeApproval()]} />);

        expect(
            screen.getByRole('link', { name: /Approve the delivery plan/ }),
        ).toHaveAttribute('href', '/work/work-orders/42');
    });

    it('falls back to the detail sheet when there is no work order', async () => {
        const onViewApproval = vi.fn();
        render(
            <ApprovalsCard
                approvals={[makeApproval({ workOrderId: '' })]}
                onViewApproval={onViewApproval}
            />,
        );

        expect(screen.queryByRole('link')).not.toBeInTheDocument();

        await userEvent.click(
            screen.getByRole('button', { name: /Approve the delivery plan/ }),
        );

        expect(onViewApproval).toHaveBeenCalledWith('1');
    });
});

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Breadcrumbs } from '../breadcrumbs';

vi.mock('@inertiajs/react', () => ({
    Link: ({
        href,
        children,
        ...props
    }: {
        href: string;
        children: ReactNode;
    }) => (
        <a href={href} {...props}>
            {children}
        </a>
    ),
}));

const breadcrumbs = [
    { title: 'Work', href: '/work' },
    {
        title: 'Website Redesign',
        href: '/work/projects/1',
        siblings: [
            { title: 'Website Redesign', href: '/work/projects/1' },
            { title: 'Mobile App', href: '/work/projects/2' },
            { title: 'Brand Refresh', href: '/work/projects/3' },
        ],
    },
];

describe('Breadcrumbs sibling switcher', () => {
    it('filters the sibling list by the search term', async () => {
        const user = userEvent.setup();
        render(<Breadcrumbs breadcrumbs={breadcrumbs} />);

        await user.click(screen.getByLabelText('Switch to sibling'));
        await user.type(screen.getByLabelText('Search'), 'mob');

        expect(screen.getByText('Mobile App')).toBeInTheDocument();
        expect(screen.queryByText('Brand Refresh')).not.toBeInTheDocument();
    });

    it('shows an empty state when nothing matches', async () => {
        const user = userEvent.setup();
        render(<Breadcrumbs breadcrumbs={breadcrumbs} />);

        await user.click(screen.getByLabelText('Switch to sibling'));
        await user.type(screen.getByLabelText('Search'), 'zzz');

        expect(screen.getByText('No matches found.')).toBeInTheDocument();
    });

    it('clears the search when the switcher is reopened', async () => {
        const user = userEvent.setup();
        render(<Breadcrumbs breadcrumbs={breadcrumbs} />);

        const trigger = screen.getByLabelText('Switch to sibling');
        await user.click(trigger);
        await user.type(screen.getByLabelText('Search'), 'mob');
        await user.keyboard('{Escape}');
        await user.click(trigger);

        expect(screen.getByLabelText('Search')).toHaveValue('');
        expect(screen.getByText('Brand Refresh')).toBeInTheDocument();
    });
});

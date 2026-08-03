import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ProjectTeamSection } from '../project-team-section';
import type { ProjectAssignableUser, ProjectTeamMember } from '@/types/work';

vi.mock('@inertiajs/react', async () => {
    const actual = await vi.importActual<Record<string, unknown>>(
        '@inertiajs/react',
    );

    return {
        ...actual,
        usePage: () => ({ props: { auth: { user: { id: 1 } } } }),
        router: { post: vi.fn(), delete: vi.fn() },
    };
});

function member(overrides: Partial<ProjectTeamMember> = {}): ProjectTeamMember {
    return {
        id: '2',
        name: 'Bob Smith',
        email: 'bob@example.com',
        avatarUrl: null,
        roles: [{ role: 'member', scope: 'project', scopeTitle: 'Apollo' }],
        workload: {
            workOrdersCount: 0,
            tasksCount: 0,
            totalEstimatedHours: 0,
        },
        isExplicitMember: true,
        canRemove: true,
        ...overrides,
    };
}

const assignableUsers: ProjectAssignableUser[] = [
    {
        id: '3',
        name: 'Carol Williams',
        email: 'carol@example.com',
        avatarUrl: null,
        hasAccess: false,
    },
    // Appears in the team card but cannot reach the project, so must stay offerable.
    {
        id: '5',
        name: 'Erin Assignee',
        email: 'erin@example.com',
        avatarUrl: null,
        hasAccess: false,
    },
    {
        id: '1',
        name: 'Andrei Owner',
        email: 'andrei@example.com',
        avatarUrl: null,
        hasAccess: true,
    },
];

function renderSection(props: Partial<React.ComponentProps<typeof ProjectTeamSection>> = {}) {
    return render(
        <ProjectTeamSection
            teamMembers={[member()]}
            projectId="10"
            isPrivate
            canManageMembers
            assignableUsers={assignableUsers}
            {...props}
        />,
    );
}

describe('ProjectTeamSection', () => {
    it('offers the add action on a private project the user can manage', () => {
        renderSection();

        expect(screen.getByTestId('add-project-member')).toBeInTheDocument();
    });

    it('hides the add action on a public project, where access is already team-wide', () => {
        renderSection({ isPrivate: false });

        expect(screen.queryByTestId('add-project-member')).not.toBeInTheDocument();
    });

    it('hides the add action when the user cannot manage members', () => {
        renderSection({ canManageMembers: false });

        expect(screen.queryByTestId('add-project-member')).not.toBeInTheDocument();
    });

    it('renders the member badge for an explicitly added member', async () => {
        renderSection();

        await userEvent.click(screen.getByRole('button', { name: /Team \(1\)/ }));

        expect(screen.getByText('Member')).toBeInTheDocument();
    });

    it('offers people without access, including those already shown in the team card', async () => {
        renderSection({
            teamMembers: [
                member(),
                member({
                    id: '5',
                    name: 'Erin Assignee',
                    roles: [
                        { role: 'assigned', scope: 'work_order', scopeTitle: 'WO-1' },
                    ],
                    isExplicitMember: false,
                    canRemove: false,
                }),
            ],
        });

        await userEvent.click(screen.getByTestId('add-project-member'));
        await userEvent.click(
            screen.getByTestId('project-member-picker-trigger'),
        );

        expect(screen.getByRole('checkbox', { name: 'Carol Williams' })).toBeInTheDocument();
        // In the team card as an assignee, but with no access - must still be offerable.
        expect(screen.getByRole('checkbox', { name: 'Erin Assignee' })).toBeInTheDocument();
        // Already reaches the project, so nothing to grant.
        expect(screen.queryByRole('checkbox', { name: 'Andrei Owner' })).not.toBeInTheDocument();
    });

    it('offers a remove control only for removable members', async () => {
        renderSection({
            teamMembers: [
                member(),
                member({
                    id: '4',
                    name: 'Dana Scully',
                    roles: [
                        { role: 'consulted', scope: 'project', scopeTitle: 'Apollo' },
                    ],
                    isExplicitMember: false,
                    canRemove: false,
                }),
            ],
        });

        await userEvent.click(screen.getByRole('button', { name: /Team \(2\)/ }));

        expect(
            screen.getByRole('button', { name: 'Remove Bob Smith from project' }),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: 'Remove Dana Scully from project' }),
        ).not.toBeInTheDocument();
    });
});

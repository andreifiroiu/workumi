import type { AuthAbilities, SharedData, TeamRoleCode } from '@/types';
import { usePage } from '@inertiajs/react';
import { useMemo } from 'react';

/**
 * Abilities assumed when the server has not shared any.
 *
 * Fails closed so that a cached bundle meeting an older server hides
 * privileged UI rather than showing it.
 */
const NO_ABILITIES: AuthAbilities = {
    administerTeam: false,
    writeContent: false,
};

/**
 * The current user's role and abilities within their current team.
 *
 * Note this is the team membership role, not `auth.user.role`, which is a
 * free-text job title.
 */
export function usePermissions() {
    const { auth } = usePage<SharedData>().props;

    return useMemo(() => {
        const roleCode: TeamRoleCode | null = auth?.team?.roleCode ?? null;

        return {
            roleCode,
            isOwner: roleCode === 'owner',
            isAdmin: roleCode === 'owner' || roleCode === 'admin',
            isViewer: roleCode === 'viewer',
            can: auth?.can ?? NO_ABILITIES,
        } as const;
    }, [auth]);
}

/**
 * Convenience wrapper: `useCan('administerTeam')`.
 */
export function useCan(ability: keyof AuthAbilities): boolean {
    return usePermissions().can[ability];
}

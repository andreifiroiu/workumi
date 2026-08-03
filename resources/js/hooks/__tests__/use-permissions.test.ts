import { useCan, usePermissions } from '@/hooks/use-permissions';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockPageProps = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));

vi.mock('@inertiajs/react', () => ({
    usePage: () => ({ props: mockPageProps.current }),
}));

function setAuth(auth: unknown) {
    mockPageProps.current = { auth };
}

describe('usePermissions', () => {
    beforeEach(() => {
        mockPageProps.current = {};
    });

    it('reports the owner as both owner and admin', () => {
        setAuth({
            team: { id: 1, roleCode: 'owner', isOwner: true },
            can: { administerTeam: true, writeContent: true },
        });

        const { result } = renderHook(() => usePermissions());

        expect(result.current.roleCode).toBe('owner');
        expect(result.current.isOwner).toBe(true);
        expect(result.current.isAdmin).toBe(true);
        expect(result.current.isViewer).toBe(false);
    });

    it('treats the admin role as admin but not owner', () => {
        setAuth({
            team: { id: 1, roleCode: 'admin', isOwner: false },
            can: { administerTeam: true, writeContent: true },
        });

        const { result } = renderHook(() => usePermissions());

        expect(result.current.isAdmin).toBe(true);
        expect(result.current.isOwner).toBe(false);
    });

    it('reports a viewer as neither admin nor able to write', () => {
        setAuth({
            team: { id: 1, roleCode: 'viewer', isOwner: false },
            can: { administerTeam: false, writeContent: false },
        });

        const { result } = renderHook(() => usePermissions());

        expect(result.current.isViewer).toBe(true);
        expect(result.current.isAdmin).toBe(false);
        expect(result.current.can.writeContent).toBe(false);
    });

    it('fails closed when the server shared no abilities', () => {
        setAuth({ user: null });

        const { result } = renderHook(() => usePermissions());

        expect(result.current.roleCode).toBeNull();
        expect(result.current.can.administerTeam).toBe(false);
        expect(result.current.can.writeContent).toBe(false);
    });

    it('fails closed when auth is absent entirely', () => {
        mockPageProps.current = {};

        const { result } = renderHook(() => usePermissions());

        expect(result.current.can.administerTeam).toBe(false);
        expect(result.current.isAdmin).toBe(false);
    });
});

describe('useCan', () => {
    it('returns the named ability', () => {
        setAuth({
            team: { id: 1, roleCode: 'member', isOwner: false },
            can: { administerTeam: false, writeContent: true },
        });

        expect(renderHook(() => useCan('writeContent')).result.current).toBe(true);
        expect(renderHook(() => useCan('administerTeam')).result.current).toBe(false);
    });
});

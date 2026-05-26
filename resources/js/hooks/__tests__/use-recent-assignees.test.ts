import { useRecentAssignees } from '@/hooks/use-recent-assignees';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

const STORAGE_KEY = 'workumi:recent-assignees';

describe('useRecentAssignees', () => {
    beforeEach(() => {
        window.localStorage.clear();
    });

    it('starts empty when nothing is stored', () => {
        const { result } = renderHook(() => useRecentAssignees());

        expect(result.current.recentIds).toEqual([]);
    });

    it('records an assignee most-recent-first', () => {
        const { result } = renderHook(() => useRecentAssignees());

        act(() => result.current.recordAssignee('a'));
        act(() => result.current.recordAssignee('b'));

        expect(result.current.recentIds).toEqual(['b', 'a']);
    });

    it('moves a re-used assignee back to the front without duplicating', () => {
        const { result } = renderHook(() => useRecentAssignees());

        act(() => result.current.recordAssignee('a'));
        act(() => result.current.recordAssignee('b'));
        act(() => result.current.recordAssignee('a'));

        expect(result.current.recentIds).toEqual(['a', 'b']);
    });

    it('caps the list at the configured maximum', () => {
        const { result } = renderHook(() => useRecentAssignees(2));

        act(() => result.current.recordAssignee('a'));
        act(() => result.current.recordAssignee('b'));
        act(() => result.current.recordAssignee('c'));

        expect(result.current.recentIds).toEqual(['c', 'b']);
    });

    it('ignores empty or nullish ids', () => {
        const { result } = renderHook(() => useRecentAssignees());

        act(() => result.current.recordAssignee(''));
        act(() => result.current.recordAssignee(null));
        act(() => result.current.recordAssignee(undefined));

        expect(result.current.recentIds).toEqual([]);
    });

    it('persists across hook instances via localStorage', () => {
        const first = renderHook(() => useRecentAssignees());
        act(() => first.result.current.recordAssignee('a'));

        const second = renderHook(() => useRecentAssignees());

        expect(second.result.current.recentIds).toEqual(['a']);
    });

    it('tolerates corrupt stored data', () => {
        window.localStorage.setItem(STORAGE_KEY, 'not-json');

        const { result } = renderHook(() => useRecentAssignees());

        expect(result.current.recentIds).toEqual([]);
    });
});

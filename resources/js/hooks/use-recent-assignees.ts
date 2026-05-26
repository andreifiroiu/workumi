import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'workumi:recent-assignees';
const DEFAULT_MAX = 4;

/**
 * Read the persisted recent-assignee ids, tolerating missing/corrupt storage.
 */
const readStored = (): string[] => {
    if (typeof window === 'undefined') {
        return [];
    }

    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            return [];
        }

        const parsed = JSON.parse(raw);

        return Array.isArray(parsed)
            ? parsed.filter(
                  (id): id is string => typeof id === 'string' && id.length > 0,
              )
            : [];
    } catch {
        return [];
    }
};

/**
 * Track the user ids most recently chosen as task assignees, persisted to
 * localStorage so quick-select chips can mirror the Due Date presets.
 *
 * `recentIds` is ordered most-recent-first and capped at `max`. Call
 * `recordAssignee` once an assignment is actually saved (revealed preference).
 */
export function useRecentAssignees(max: number = DEFAULT_MAX) {
    const [recentIds, setRecentIds] = useState<string[]>([]);

    useEffect(() => {
        setRecentIds(readStored().slice(0, max));
    }, [max]);

    const recordAssignee = useCallback(
        (id: string | null | undefined) => {
            if (!id) {
                return;
            }

            setRecentIds((previous) => {
                const next = [
                    id,
                    ...previous.filter((existing) => existing !== id),
                ].slice(0, max);

                if (typeof window !== 'undefined') {
                    try {
                        window.localStorage.setItem(
                            STORAGE_KEY,
                            JSON.stringify(next),
                        );
                    } catch {
                        // Ignore write failures (private mode, quota exceeded).
                    }
                }

                return next;
            });
        },
        [max],
    );

    return { recentIds, recordAssignee } as const;
}

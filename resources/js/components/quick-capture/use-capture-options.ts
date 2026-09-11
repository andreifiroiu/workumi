import { options as captureOptions } from '@/actions/App/Http/Controllers/QuickCaptureController';
import { csrfHeaders } from '@/lib/csrf';
import type { CaptureOptions } from '@/types/quick-capture';
import { useCallback, useEffect, useState } from 'react';

const EMPTY: CaptureOptions = { parties: [], projects: [], workOrders: [] };

/**
 * Loads the selectable parents the first time the panel opens.
 *
 * The launcher is mounted on every page, so this deliberately fetches on demand
 * rather than riding along as an Inertia prop on every response.
 */
export function useCaptureOptions(enabled: boolean) {
    const [data, setData] = useState<CaptureOptions>(EMPTY);
    const [isLoading, setIsLoading] = useState(false);
    const [hasLoaded, setHasLoaded] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(captureOptions.url(), {
                headers: csrfHeaders(),
            });

            if (!response.ok) {
                // 401 means the session went away, which "could not load your
                // projects" would misdiagnose as a server problem.
                setError(
                    response.status === 401 || response.status === 419
                        ? 'Your session expired — reload the page.'
                        : `Could not load your projects and work orders (${response.status}).`,
                );
                // Clear the loaded flag so reopening the panel retries instead
                // of showing a list that is now known to be stale.
                setHasLoaded(false);

                return;
            }

            setData((await response.json()) as CaptureOptions);
            setHasLoaded(true);
        } catch (cause) {
            console.error('[quick-capture] options request failed', cause);
            setError('Could not load your projects and work orders.');
            setHasLoaded(false);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (enabled && !hasLoaded && !isLoading) {
            void load();
        }
    }, [enabled, hasLoaded, isLoading, load]);

    return { options: data, isLoading, error, reload: load };
}

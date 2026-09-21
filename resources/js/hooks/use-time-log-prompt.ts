import type { TimeLogPrompt } from '@/types/work';
import { useCallback, useState } from 'react';

interface TimeLogPromptResponse {
    timeLogPrompt?: TimeLogPrompt | null;
}

interface UseTimeLogPromptResult {
    /** The task awaiting an estimate, or null when there is nothing to ask. */
    prompt: TimeLogPrompt | null;
    /** Feed the parsed JSON body of a close request; a missing key simply clears the prompt. */
    capture: (response: TimeLogPromptResponse | null | undefined) => void;
    dismiss: () => void;
}

/**
 * Holds the "how long did this take?" prompt a closing endpoint hands back.
 *
 * Tasks can be closed from a handful of screens, and every one of them parses the
 * response JSON already, so each call site needs only capture(data) and a
 * <TimeLogPromptDialog> to join in.
 */
export function useTimeLogPrompt(): UseTimeLogPromptResult {
    const [prompt, setPrompt] = useState<TimeLogPrompt | null>(null);

    const capture = useCallback(
        (response: TimeLogPromptResponse | null | undefined) => {
            setPrompt(response?.timeLogPrompt ?? null);
        },
        [],
    );

    const dismiss = useCallback(() => setPrompt(null), []);

    return { prompt, capture, dismiss };
}

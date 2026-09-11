import { parse as parseCapture } from '@/actions/App/Http/Controllers/QuickCaptureController';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { csrfHeaders } from '@/lib/csrf';
import type { CaptureProposal } from '@/types/quick-capture';
import { Sparkles } from 'lucide-react';
import { useState } from 'react';

interface AiCaptureFormProps {
    /** Called with the proposal so the panel can switch to the filled-in form. */
    onProposal: (proposal: CaptureProposal) => void;
}

/** Mirrors the server's `max:5000` so the limit is visible before submitting. */
const MAX_TEXT = 5000;

/**
 * "Try again" is wrong for most of these — an expired token or an over-long
 * body fails identically on every retry — so each one says what to actually do.
 */
async function messageForFailure(response: Response): Promise<string> {
    if (response.status === 419 || response.status === 401) {
        return 'Your session expired — reload the page and try again.';
    }

    if (response.status === 429) {
        return 'Too many suggestions in a row. Wait a moment, or fill in the form.';
    }

    if (response.status === 422) {
        const body = await response.json().catch(() => null);
        const message = body?.errors?.text?.[0] ?? body?.message;

        return typeof message === 'string'
            ? message
            : 'That text could not be used. Try shortening it.';
    }

    return `Could not read that (${response.status}). Try again, or fill in the form.`;
}

export function AiCaptureForm({ onProposal }: AiCaptureFormProps) {
    const [text, setText] = useState('');
    const [isParsing, setIsParsing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleParse = async () => {
        const trimmed = text.trim();
        if (!trimmed) {
            return;
        }

        setIsParsing(true);
        setError(null);

        try {
            const response = await fetch(parseCapture.url(), {
                method: 'POST',
                headers: csrfHeaders(),
                body: JSON.stringify({ text: trimmed }),
            });

            if (!response.ok) {
                setError(await messageForFailure(response));

                return;
            }

            const { proposal } = (await response.json()) as {
                proposal: CaptureProposal;
            };

            onProposal(proposal);
        } catch (cause) {
            console.error('[quick-capture] parse request failed', cause);
            setError('Could not reach the server. Try again, or fill in the form.');
        } finally {
            setIsParsing(false);
        }
    };

    return (
        <div className="grid gap-4">
            <div className="grid gap-2">
                <Label htmlFor="capture-text">
                    Write it however you like
                </Label>
                <Textarea
                    id="capture-text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Draft the Q3 report for the Acme redesign by next Friday"
                    rows={5}
                    maxLength={MAX_TEXT}
                    autoFocus
                />
                <p className="text-xs text-muted-foreground">
                    Nothing is saved until you review what it suggests.
                    {text.length > MAX_TEXT * 0.8 && (
                        <span className="ml-1 tabular-nums">
                            {text.length}/{MAX_TEXT}
                        </span>
                    )}
                </p>
            </div>

            {error && (
                <p className="text-sm text-destructive" role="alert">
                    {error}
                </p>
            )}

            <Button
                type="button"
                onClick={handleParse}
                disabled={!text.trim() || isParsing}
            >
                {isParsing ? (
                    <>
                        <Spinner className="size-4" />
                        Reading…
                    </>
                ) : (
                    <>
                        <Sparkles className="size-4" />
                        Suggest a record
                    </>
                )}
            </Button>
        </div>
    );
}

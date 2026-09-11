import { Button } from '@/components/ui/button';
import type { SharedData } from '@/types';
import type { CaptureResult } from '@/types/quick-capture';
import { Link, usePage } from '@inertiajs/react';
import { Check, X } from 'lucide-react';
import { useEffect, useState } from 'react';

const LABEL: Record<CaptureResult['type'], string> = {
    project: 'Project',
    work_order: 'Work order',
    task: 'Task',
    note: 'Note',
};

const DISMISS_AFTER_MS = 6000;

/**
 * Confirms what a capture actually created, and links to it.
 *
 * The store action redirects back rather than returning the record, so the
 * created item's id and URL arrive through the flash bag. Without this the
 * success path is completely silent and a capture that failed looks identical
 * to one that worked.
 */
export function CaptureConfirmation() {
    const { flash } = usePage<SharedData>().props;
    const capture = flash?.capture ?? null;

    // Keyed by id so a second capture of the same record re-announces, and so
    // dismissing one does not suppress the next.
    const [dismissed, setDismissed] = useState<string | null>(null);

    const key = capture ? `${capture.type}:${capture.id}` : null;
    const visible = capture !== null && dismissed !== key;

    useEffect(() => {
        if (!visible || key === null) {
            return;
        }

        const timer = window.setTimeout(
            () => setDismissed(key),
            DISMISS_AFTER_MS,
        );

        return () => window.clearTimeout(timer);
    }, [visible, key]);

    if (!visible || capture === null) {
        return null;
    }

    return (
        <div
            role="status"
            aria-live="polite"
            className="fixed bottom-24 right-6 z-50 flex max-w-[calc(100vw-3rem)] items-start gap-3 rounded-lg border border-border bg-background p-3 shadow-lg"
        >
            <Check className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-500" />
            <div className="min-w-0 text-sm">
                <p className="font-medium text-foreground">
                    {LABEL[capture.type]} created
                </p>
                <p className="truncate text-muted-foreground">
                    {capture.title}
                </p>
                {capture.url && (
                    <Link
                        href={capture.url}
                        className="mt-1 inline-block font-medium text-primary underline underline-offset-4"
                        onClick={() => setDismissed(key)}
                    >
                        Open it
                    </Link>
                )}
            </div>
            <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-6 shrink-0"
                aria-label="Dismiss"
                onClick={() => setDismissed(key)}
            >
                <X className="size-4" />
            </Button>
        </div>
    );
}

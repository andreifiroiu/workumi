import { csrfHeaders } from '@/lib/csrf';
import { cn } from '@/lib/utils';
import type { SharedData } from '@/types';
import type { ReviewActionKind, ReviewShowProps } from '@/types/review';
import { Link, usePage } from '@inertiajs/react';
import { ChevronLeft, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ReviewActionBar, type ReviewActionValue } from './review-action-bar';
import { ReviewCard } from './review-card';
import { ReviewComplete } from './review-complete';

export function ReviewSession({
    flow,
    items,
    teamMembers,
    currentUserId,
}: ReviewShowProps) {
    const page = usePage<SharedData>();
    const firstName = useMemo(
        () => page.props.auth?.user?.name?.split(' ')[0] ?? '',
        [page.props.auth?.user?.name],
    );

    const [index, setIndex] = useState(0);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [outcomes, setOutcomes] = useState<
        Record<number, 'handled' | 'snoozed'>
    >({});

    const total = items.length;
    const current = items[index] ?? null;
    const isComplete = index >= total;
    const canGoBack = index > 0 && !processing;

    const outcomeValues = Object.values(outcomes);
    const handledCount = outcomeValues.filter(
        (outcome) => outcome === 'handled',
    ).length;
    const snoozedCount = outcomeValues.filter(
        (outcome) => outcome === 'snoozed',
    ).length;

    const advance = () => {
        setError(null);
        setIndex((value) => value + 1);
    };

    const goBack = () => {
        setError(null);
        setIndex((value) => Math.max(0, value - 1));
    };

    const handleAction = async (
        kind: ReviewActionKind,
        value: ReviewActionValue | null,
    ) => {
        if (!current || processing) {
            return;
        }

        if (kind === 'open') {
            window.open(current.href, '_blank', 'noopener');
            return;
        }

        const body: Record<string, unknown> = {
            itemId: Number(current.id),
            action: kind,
        };
        if (kind === 'set_due_date') {
            body.dueDate = value?.dueDate;
        } else if (kind === 'assign') {
            body.userId = Number(value?.userId);
        } else if (kind === 'snooze') {
            body.days = value?.days ?? 7;
        }

        setProcessing(true);
        try {
            const response = await fetch(`/review/${flow.key}/apply`, {
                method: 'POST',
                headers: csrfHeaders(),
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                const data = await response.json().catch(() => null);
                setError(
                    data?.message ?? 'Something went wrong. Please try again.',
                );
                return;
            }

            setOutcomes((previous) => ({
                ...previous,
                [index]: kind === 'snooze' ? 'snoozed' : 'handled',
            }));
            advance();
        } catch (requestError) {
            console.error('Failed to apply review action:', requestError);
            setError('Something went wrong. Please try again.');
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-4 py-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-1">
                    {canGoBack && (
                        <button
                            type="button"
                            onClick={goBack}
                            aria-label="Previous item"
                            className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
                        >
                            <ChevronLeft className="h-6 w-6" />
                        </button>
                    )}
                    <div>
                        <h1 className="text-2xl font-light text-slate-400 dark:text-slate-500">
                            {firstName
                                ? `Good day, ${firstName}`
                                : 'Take a moment'}
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-500">
                            {flow.title}
                        </p>
                    </div>
                </div>
                <Link
                    href="/review"
                    className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
                    aria-label="Close review"
                >
                    <X className="h-6 w-6" />
                </Link>
            </div>

            {/* Body */}
            <div className="flex flex-1 flex-col items-center justify-center py-8">
                {isComplete ? (
                    <ReviewComplete
                        handledCount={handledCount}
                        snoozedCount={snoozedCount}
                    />
                ) : (
                    current && (
                        <div className="w-full">
                            <ProgressIndicator index={index} total={total} />
                            <ReviewCard item={current} />
                            {error && (
                                <p className="mt-4 text-center text-sm text-red-600 dark:text-red-400">
                                    {error}
                                </p>
                            )}
                        </div>
                    )
                )}
            </div>

            {/* Action bar */}
            {!isComplete && current && (
                <div className="border-t border-slate-100 pt-6 dark:border-slate-800">
                    <ReviewActionBar
                        actions={flow.actions}
                        teamMembers={teamMembers}
                        currentUserId={currentUserId}
                        disabled={processing}
                        onAction={handleAction}
                    />
                </div>
            )}
        </div>
    );
}

function ProgressIndicator({ index, total }: { index: number; total: number }) {
    if (total <= 12) {
        return (
            <div className="mb-6 flex items-center justify-center gap-2">
                {Array.from({ length: total }).map((_, dotIndex) => (
                    <span
                        key={dotIndex}
                        className={cn(
                            'h-2.5 rounded-full transition-all',
                            dotIndex === index
                                ? 'w-6 bg-blue-500'
                                : dotIndex < index
                                  ? 'w-2.5 bg-emerald-400'
                                  : 'w-2.5 bg-slate-200 dark:bg-slate-700',
                        )}
                    />
                ))}
            </div>
        );
    }

    return (
        <div className="mb-6">
            <div className="mb-2 text-center text-sm text-slate-500">
                {index + 1} of {total}
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                <div
                    className="h-full rounded-full bg-blue-500 transition-all"
                    style={{ width: `${((index + 1) / total) * 100}%` }}
                />
            </div>
        </div>
    );
}

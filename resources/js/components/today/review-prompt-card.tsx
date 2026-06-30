import { Button } from '@/components/ui/button';
import type { ReviewFlowSummary } from '@/types/review';
import { Link } from '@inertiajs/react';
import { ArrowRight, ListChecks } from 'lucide-react';

interface ReviewPromptCardProps {
    flows: ReviewFlowSummary[];
}

export function ReviewPromptCard({ flows }: ReviewPromptCardProps) {
    const actionable = flows.filter((flow) => flow.count > 0);
    const total = actionable.reduce((sum, flow) => sum + flow.count, 0);

    if (total === 0) {
        return null;
    }

    return (
        <div className="flex flex-col gap-4 rounded-xl border border-blue-200 bg-blue-50/60 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-blue-900/50 dark:bg-blue-950/20">
            <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300">
                    <ListChecks className="h-5 w-5" />
                </div>
                <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">
                        Take a moment to review
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        {total} {total === 1 ? 'item needs' : 'items need'} your
                        attention across {actionable.length}{' '}
                        {actionable.length === 1 ? 'flow' : 'flows'}.
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                        {actionable.map((flow) => (
                            <Link
                                key={flow.key}
                                href={`/review/${flow.key}`}
                                className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200 transition-colors hover:ring-blue-300 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700"
                            >
                                {flow.title}
                                <span className="rounded-full bg-amber-100 px-1.5 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                                    {flow.count}
                                </span>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
            <Button asChild className="shrink-0">
                <Link href="/review">
                    Start review
                    <ArrowRight className="h-4 w-4" />
                </Link>
            </Button>
        </div>
    );
}

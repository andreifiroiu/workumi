import { fallbackReviewIcon, reviewIcons } from '@/components/review';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem } from '@/types';
import type { ReviewIndexProps } from '@/types/review';
import { Head, Link } from '@inertiajs/react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Review', href: '/review' }];

export default function ReviewIndex({ flows }: ReviewIndexProps) {
    const totalToReview = flows.reduce((sum, flow) => sum + flow.count, 0);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Review" />
            <div className="mx-auto flex h-full w-full max-w-3xl flex-1 flex-col gap-6 p-4">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
                        Take a moment to review
                    </h1>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        Run a quick guided pass over work that needs your
                        attention — one item at a time.
                    </p>
                </div>

                {totalToReview === 0 ? (
                    <div className="flex flex-col items-center rounded-xl border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                            <CheckCircle2 className="h-8 w-8" />
                        </div>
                        <p className="font-medium text-slate-700 dark:text-slate-300">
                            Nothing to review right now
                        </p>
                        <p className="text-sm text-slate-500">
                            Everything is scheduled and assigned. Great work!
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {flows.map((flow) => {
                            const Icon =
                                reviewIcons[flow.icon] ?? fallbackReviewIcon;
                            const hasItems = flow.count > 0;

                            return (
                                <div
                                    key={flow.key}
                                    className={cn(
                                        'flex flex-col rounded-xl border bg-white p-6 dark:bg-slate-900',
                                        hasItems
                                            ? 'border-slate-200 dark:border-slate-800'
                                            : 'border-slate-100 opacity-70 dark:border-slate-800/60',
                                    )}
                                >
                                    <div className="mb-4 flex items-center justify-between">
                                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                                            <Icon className="h-5 w-5" />
                                        </div>
                                        <span
                                            className={cn(
                                                'inline-flex min-w-7 items-center justify-center rounded-full px-2 py-0.5 text-sm font-semibold',
                                                hasItems
                                                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                                                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
                                            )}
                                        >
                                            {flow.count}
                                        </span>
                                    </div>
                                    <h3 className="font-semibold text-slate-900 dark:text-white">
                                        {flow.title}
                                    </h3>
                                    <p className="mt-1 mb-4 flex-1 text-sm text-slate-600 dark:text-slate-400">
                                        {flow.description}
                                    </p>
                                    {hasItems ? (
                                        <Button asChild className="w-full">
                                            <Link href={`/review/${flow.key}`}>
                                                Start review
                                                <ArrowRight className="h-4 w-4" />
                                            </Link>
                                        </Button>
                                    ) : (
                                        <Button
                                            disabled
                                            className="w-full"
                                            variant="outline"
                                        >
                                            All done
                                        </Button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}

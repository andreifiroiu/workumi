import { Button } from '@/components/ui/button';
import { Link } from '@inertiajs/react';
import { CheckCircle2 } from 'lucide-react';

interface ReviewCompleteProps {
    handledCount: number;
    snoozedCount: number;
}

export function ReviewComplete({
    handledCount,
    snoozedCount,
}: ReviewCompleteProps) {
    return (
        <div className="flex animate-in flex-col items-center text-center duration-300 fade-in-0 zoom-in-95">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                <CheckCircle2 className="h-10 w-10" />
            </div>
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
                All caught up
            </h2>
            <p className="mt-2 max-w-sm text-sm text-slate-600 dark:text-slate-400">
                {handledCount > 0
                    ? `You reviewed ${handledCount} ${handledCount === 1 ? 'item' : 'items'}${
                          snoozedCount > 0
                              ? `, snoozing ${snoozedCount} for later`
                              : ''
                      }.`
                    : 'Nothing left to review here. Nice work!'}
            </p>
            <div className="mt-6 flex gap-3">
                <Button asChild>
                    <Link href="/review">Back to reviews</Link>
                </Button>
                <Button asChild variant="outline">
                    <Link href="/today">Go to Today</Link>
                </Button>
            </div>
        </div>
    );
}

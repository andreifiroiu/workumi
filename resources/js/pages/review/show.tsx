import { ReviewSession } from '@/components/review';
import type { ReviewShowProps } from '@/types/review';
import { Head } from '@inertiajs/react';

export default function ReviewShow(props: ReviewShowProps) {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            <Head title={`Review · ${props.flow.title}`} />
            <ReviewSession {...props} />
        </div>
    );
}

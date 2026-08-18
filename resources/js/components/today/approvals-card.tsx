import type { TodayApproval } from '@/types/today';
import { Link } from '@inertiajs/react';
import { ChevronRight, FileCheck } from 'lucide-react';

interface ApprovalsCardProps {
    approvals: TodayApproval[];
    onViewApproval?: (id: string) => void;
}

const priorityColors: Record<string, string> = {
    high: 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400',
    medium: 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400',
    low: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
};

const typeLabels: Record<string, string> = {
    deliverable: 'Deliverable',
    estimate: 'Estimate',
    draft: 'Draft',
};

export function ApprovalsCard({
    approvals,
    onViewApproval,
}: ApprovalsCardProps) {
    return (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-200 p-6 dark:border-slate-800">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400">
                            <FileCheck className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                                Approvals Queue
                            </h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                Awaiting your review
                            </p>
                        </div>
                    </div>
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white dark:bg-indigo-500">
                        {approvals.length}
                    </div>
                </div>
            </div>

            <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {approvals.length === 0 ? (
                    <div className="p-8 text-center">
                        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400">
                            <FileCheck className="h-8 w-8" />
                        </div>
                        <p className="font-medium text-slate-600 dark:text-slate-400">
                            No approvals pending
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-500">
                            You're all caught up!
                        </p>
                    </div>
                ) : (
                    approvals.map((approval) => {
                        const itemClassName =
                            'group block w-full p-4 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50';
                        const content = (
                            <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0 flex-1">
                                    <div className="mb-1 flex items-center gap-2">
                                        <span
                                            className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${priorityColors[approval.priority]}`}
                                        >
                                            {typeLabels[approval.type]}
                                        </span>
                                        <span
                                            className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium capitalize ${priorityColors[approval.priority]}`}
                                        >
                                            {approval.priority}
                                        </span>
                                    </div>
                                    <h4 className="mb-1 truncate font-medium text-slate-900 dark:text-white">
                                        {approval.title}
                                    </h4>
                                    <p className="mb-2 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">
                                        {approval.description}
                                    </p>
                                    <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-500">
                                        <span>
                                            Created by {approval.createdBy}
                                        </span>
                                        <span>•</span>
                                        <span>{approval.projectTitle}</span>
                                    </div>
                                </div>
                                <ChevronRight className="mt-1 h-5 w-5 flex-shrink-0 text-slate-400 transition-colors group-hover:text-slate-600 dark:group-hover:text-slate-300" />
                            </div>
                        );

                        // Approvals tied to a work order open its detail page so the
                        // plan can be reviewed in full; the rest fall back to the sheet.
                        if (approval.workOrderId) {
                            return (
                                <Link
                                    key={approval.id}
                                    href={`/work/work-orders/${approval.workOrderId}`}
                                    className={itemClassName}
                                >
                                    {content}
                                </Link>
                            );
                        }

                        return (
                            <button
                                key={approval.id}
                                onClick={() => onViewApproval?.(approval.id)}
                                className={itemClassName}
                            >
                                {content}
                            </button>
                        );
                    })
                )}
            </div>
        </div>
    );
}

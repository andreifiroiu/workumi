import { Badge } from '@/components/ui/badge';

interface StatusBadgeProps {
    status: string;
    type?: 'project' | 'workOrder' | 'task' | 'deliverable';
}

const projectStatusColors: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900',
    on_hold: 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border-amber-200 dark:border-amber-900',
    completed: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700',
    archived: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500 border-slate-200 dark:border-slate-700',
};

const workOrderStatusColors: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700',
    active: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900',
    in_review: 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border-amber-200 dark:border-amber-900',
    approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900',
    delivered: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900',
    backlog: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700',
};

const taskStatusColors: Record<string, string> = {
    todo: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700',
    in_progress: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900',
    done: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900',
};

const deliverableStatusColors: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700',
    in_review: 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border-amber-200 dark:border-amber-900',
    approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900',
    delivered: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900',
};

export function StatusBadge({ status, type = 'project' }: StatusBadgeProps) {
    let colors: Record<string, string>;

    switch (type) {
        case 'workOrder':
            colors = workOrderStatusColors;
            break;
        case 'task':
            colors = taskStatusColors;
            break;
        case 'deliverable':
            colors = deliverableStatusColors;
            break;
        default:
            colors = projectStatusColors;
    }

    const colorClass = colors[status] || colors['draft'] || '';
    const displayStatus = status.replace('_', ' ');

    return (
        <Badge variant="outline" className={`text-xs font-medium border ${colorClass}`}>
            {displayStatus}
        </Badge>
    );
}

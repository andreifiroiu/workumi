import { CheckCircle, FileCheck, Timer, AlertTriangle } from 'lucide-react';
import type { TodayMetrics } from '@/types/today';

interface MetricsBarProps {
    metrics: TodayMetrics;
}

export function MetricsBar({ metrics }: MetricsBarProps) {
    const metricItems = [
        {
            label: 'Tasks Today',
            value: metrics.tasksCompletedToday,
            icon: CheckCircle,
            color: 'emerald',
        },
        {
            label: 'Tasks This Week',
            value: metrics.tasksCompletedThisWeek,
            icon: CheckCircle,
            color: 'emerald',
        },
        {
            label: 'Approvals Pending',
            value: metrics.approvalsPending,
            icon: FileCheck,
            color: 'indigo',
        },
        {
            label: 'Hours Logged',
            value: metrics.hoursLoggedToday,
            icon: Timer,
            color: 'slate',
        },
        {
            label: 'Active Blockers',
            value: metrics.activeBlockers,
            icon: AlertTriangle,
            color: metrics.activeBlockers > 0 ? 'amber' : 'slate',
        },
    ];

    const colorStyles: Record<string, string> = {
        emerald: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400',
        indigo: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400',
        amber: 'bg-amber-100 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400',
        slate: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    };

    const valueColorStyles: Record<string, string> = {
        emerald: 'text-emerald-700 dark:text-emerald-400',
        indigo: 'text-indigo-700 dark:text-indigo-400',
        amber: 'text-amber-700 dark:text-amber-400',
        slate: 'text-slate-900 dark:text-white',
    };

    return (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {metricItems.map((item) => {
                const Icon = item.icon;
                return (
                    <div
                        key={item.label}
                        className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
                    >
                        <div className="mb-3 flex items-center gap-2">
                            <div className={`rounded-lg p-2 ${colorStyles[item.color]}`}>
                                <Icon className="h-4 w-4" />
                            </div>
                        </div>
                        <div className={`text-2xl font-bold ${valueColorStyles[item.color]}`}>
                            {typeof item.value === 'number' && item.label === 'Hours Logged'
                                ? item.value.toFixed(1)
                                : item.value}
                        </div>
                        <div className="text-sm text-slate-600 dark:text-slate-400">{item.label}</div>
                    </div>
                );
            })}
        </div>
    );
}

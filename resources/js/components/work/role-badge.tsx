import { cn } from '@/lib/utils';
import type { TeamMemberRole } from '@/types/work';

interface RoleBadgeProps {
    role: TeamMemberRole['role'];
    className?: string;
}

const roleConfig: Record<
    TeamMemberRole['role'],
    { label: string; className: string }
> = {
    owner: {
        label: 'Owner',
        className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    },
    accountable: {
        label: 'Accountable',
        className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    },
    responsible: {
        label: 'Responsible',
        className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    },
    assigned: {
        label: 'Assigned',
        className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    },
    reviewer: {
        label: 'Reviewer',
        className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    },
    consulted: {
        label: 'Consulted',
        className: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
    },
    informed: {
        label: 'Informed',
        className: 'bg-gray-100 text-gray-700 dark:bg-gray-800/50 dark:text-gray-400',
    },
    // Access without a responsibility, so deliberately quieter than the RACI roles.
    member: {
        label: 'Member',
        className: 'bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300',
    },
};

export function RoleBadge({ role, className }: RoleBadgeProps) {
    const config = roleConfig[role];

    return (
        <span
            className={cn(
                'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
                config.className,
                className
            )}
        >
            {config.label}
        </span>
    );
}

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type {
    ReviewAction,
    ReviewActionKind,
    ReviewTeamMember,
} from '@/types/review';
import { addWeeks, endOfWeek, format } from 'date-fns';
import { useState } from 'react';
import { fallbackReviewIcon, reviewIcons } from './review-icons';

export interface ReviewActionValue {
    dueDate?: string;
    userId?: string;
    days?: number;
}

interface ReviewActionBarProps {
    actions: ReviewAction[];
    teamMembers: ReviewTeamMember[];
    currentUserId: string;
    disabled?: boolean;
    onAction: (kind: ReviewActionKind, value: ReviewActionValue | null) => void;
}

const variantStyles: Record<string, string> = {
    today: 'border-emerald-500 text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40',
    primary:
        'border-blue-500 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/40',
    accent: 'border-violet-500 text-violet-600 hover:bg-violet-50 dark:text-violet-400 dark:hover:bg-violet-950/40',
    later: 'border-amber-500 text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/40',
    neutral:
        'border-slate-400 text-slate-600 hover:bg-slate-100 dark:border-slate-500 dark:text-slate-300 dark:hover:bg-slate-800',
};

function todayString(): string {
    return format(new Date(), 'yyyy-MM-dd');
}

function endOfWeekString(): string {
    return format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
}

function endOfNextWeekString(): string {
    return format(
        endOfWeek(addWeeks(new Date(), 1), { weekStartsOn: 1 }),
        'yyyy-MM-dd',
    );
}

function dueDateForPreset(preset?: string): string {
    switch (preset) {
        case 'this_week':
            return endOfWeekString();
        case 'next_week':
            return endOfNextWeekString();
        default:
            return todayString();
    }
}

export function ReviewActionBar({
    actions,
    teamMembers,
    currentUserId,
    disabled,
    onAction,
}: ReviewActionBarProps) {
    return (
        <div className="flex flex-wrap items-start justify-center gap-x-3 gap-y-4 sm:gap-x-6">
            {actions.map((action) => (
                <ActionButton
                    key={action.key}
                    action={action}
                    teamMembers={teamMembers}
                    currentUserId={currentUserId}
                    disabled={disabled}
                    onAction={onAction}
                />
            ))}
        </div>
    );
}

interface ActionButtonProps {
    action: ReviewAction;
    teamMembers: ReviewTeamMember[];
    currentUserId: string;
    disabled?: boolean;
    onAction: (kind: ReviewActionKind, value: ReviewActionValue | null) => void;
}

function ActionButton({
    action,
    teamMembers,
    currentUserId,
    disabled,
    onAction,
}: ActionButtonProps) {
    const Icon = reviewIcons[action.icon] ?? fallbackReviewIcon;
    const circleClass = cn(
        'flex h-16 w-16 items-center justify-center rounded-full border-2 bg-white transition-colors disabled:cursor-not-allowed disabled:opacity-40 dark:bg-slate-900',
        variantStyles[action.variant] ?? variantStyles.neutral,
    );

    const label = (
        <span className="mt-2 block text-center text-xs font-semibold tracking-wide text-slate-600 uppercase dark:text-slate-400">
            {action.label}
        </span>
    );

    // Assign to a specific team member → popover picker
    if (action.kind === 'assign' && action.payload.target === 'pick') {
        return (
            <MemberPickerButton
                action={action}
                teamMembers={teamMembers}
                currentUserId={currentUserId}
                disabled={disabled}
                circleClass={circleClass}
                icon={<Icon className="h-6 w-6" />}
                label={label}
                onPick={(userId) => onAction('assign', { userId })}
            />
        );
    }

    // Pick a custom due date → popover with a date input
    if (action.kind === 'set_due_date' && action.payload.preset === 'custom') {
        return (
            <DatePickerButton
                disabled={disabled}
                circleClass={circleClass}
                icon={<Icon className="h-6 w-6" />}
                label={label}
                onPick={(dueDate) => onAction('set_due_date', { dueDate })}
            />
        );
    }

    const handleClick = () => {
        if (action.kind === 'set_due_date') {
            onAction('set_due_date', {
                dueDate: dueDateForPreset(action.payload.preset),
            });
        } else if (action.kind === 'assign') {
            onAction('assign', { userId: currentUserId });
        } else if (action.kind === 'snooze') {
            onAction('snooze', { days: action.payload.days ?? 7 });
        } else if (action.kind === 'open') {
            onAction('open', null);
        }
    };

    return (
        <div className="flex flex-col items-center">
            <button
                type="button"
                onClick={handleClick}
                disabled={disabled}
                className={circleClass}
                aria-label={action.label}
            >
                <Icon className="h-6 w-6" />
            </button>
            {label}
        </div>
    );
}

interface PickerButtonShared {
    disabled?: boolean;
    circleClass: string;
    icon: React.ReactNode;
    label: React.ReactNode;
}

function MemberPickerButton({
    action,
    teamMembers,
    currentUserId,
    disabled,
    circleClass,
    icon,
    label,
    onPick,
}: PickerButtonShared & {
    action: ReviewAction;
    teamMembers: ReviewTeamMember[];
    currentUserId: string;
    onPick: (userId: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const filtered = teamMembers.filter((member) =>
        member.name.toLowerCase().includes(query.toLowerCase()),
    );

    return (
        <div className="flex flex-col items-center">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <button
                        type="button"
                        disabled={disabled}
                        className={circleClass}
                        aria-label={action.label}
                    >
                        {icon}
                    </button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-0" align="center">
                    <div className="border-b border-slate-200 p-2 dark:border-slate-800">
                        <Input
                            autoFocus
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Search team…"
                            className="h-8"
                        />
                    </div>
                    <div className="max-h-60 overflow-y-auto p-1">
                        {filtered.length === 0 ? (
                            <p className="px-2 py-3 text-center text-sm text-slate-500">
                                No matches
                            </p>
                        ) : (
                            filtered.map((member) => (
                                <button
                                    key={member.id}
                                    type="button"
                                    onClick={() => {
                                        setOpen(false);
                                        setQuery('');
                                        onPick(member.id);
                                    }}
                                    className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                                >
                                    <span className="truncate text-slate-900 dark:text-white">
                                        {member.name}
                                    </span>
                                    {member.id === currentUserId && (
                                        <span className="ml-2 text-xs text-slate-400">
                                            You
                                        </span>
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                </PopoverContent>
            </Popover>
            {label}
        </div>
    );
}

function DatePickerButton({
    disabled,
    circleClass,
    icon,
    label,
    onPick,
}: PickerButtonShared & { onPick: (dueDate: string) => void }) {
    const [open, setOpen] = useState(false);
    const [value, setValue] = useState(todayString());

    return (
        <div className="flex flex-col items-center">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <button
                        type="button"
                        disabled={disabled}
                        className={circleClass}
                        aria-label="Pick date"
                    >
                        {icon}
                    </button>
                </PopoverTrigger>
                <PopoverContent className="w-56" align="center">
                    <div className="space-y-3">
                        <Input
                            type="date"
                            value={value}
                            min={todayString()}
                            onChange={(event) => setValue(event.target.value)}
                        />
                        <Button
                            className="w-full"
                            size="sm"
                            disabled={!value}
                            onClick={() => {
                                setOpen(false);
                                onPick(value);
                            }}
                        >
                            Set due date
                        </Button>
                    </div>
                </PopoverContent>
            </Popover>
            {label}
        </div>
    );
}

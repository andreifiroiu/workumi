import { useState, useEffect, useCallback } from 'react';
import { router, usePage } from '@inertiajs/react';
import { Clock, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { SharedData } from '@/types';
import { cn } from '@/lib/utils';

/**
 * Formats elapsed seconds into HH:MM:SS format.
 */
function formatElapsedTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return [
        hours.toString().padStart(2, '0'),
        minutes.toString().padStart(2, '0'),
        secs.toString().padStart(2, '0'),
    ].join(':');
}

/**
 * Calculates elapsed seconds from a start timestamp.
 */
function calculateElapsedSeconds(startedAt: string): number {
    const startTime = new Date(startedAt).getTime();
    const now = Date.now();
    return Math.max(0, Math.floor((now - startTime) / 1000));
}

interface ActiveTimerIndicatorProps {
    className?: string;
}

/**
 * Displays the active timer indicator in the header.
 * Only renders when there is an active timer running.
 * Provides a popover with timer details and stop button.
 */
export function ActiveTimerIndicator({ className }: ActiveTimerIndicatorProps) {
    const { props } = usePage<SharedData>();
    const { activeTimer } = props;

    const [isProcessing, setIsProcessing] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [, setTick] = useState(0);

    const startedAt = activeTimer?.startedAt;
    const elapsedSeconds = startedAt ? calculateElapsedSeconds(startedAt) : 0;

    // Re-render every second while a timer is active so elapsed time stays current
    useEffect(() => {
        if (!startedAt) {
            return;
        }

        const interval = setInterval(() => {
            setTick((value) => value + 1);
        }, 1000);

        return () => clearInterval(interval);
    }, [startedAt]);

    const handleStopTimer = useCallback(() => {
        if (!activeTimer) return;

        setIsProcessing(true);
        router.post(
            `/work/time-entries/${activeTimer.id}/stop`,
            {},
            {
                preserveScroll: true,
                onFinish: () => {
                    setIsProcessing(false);
                    setIsOpen(false);
                },
            }
        );
    }, [activeTimer]);

    // Don't render if no active timer
    if (!activeTimer) {
        return null;
    }

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    className={cn(
                        'group flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors',
                        'bg-indigo-50 text-indigo-700 hover:bg-indigo-100',
                        'dark:bg-indigo-950/50 dark:text-indigo-400 dark:hover:bg-indigo-950/70',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2',
                        className
                    )}
                    aria-label="Timer running"
                >
                    <Clock className="size-4 animate-pulse" />
                    <span className="max-w-32 truncate font-medium">{activeTimer.taskTitle}</span>
                    <span
                        data-testid="active-timer-elapsed"
                        className="font-mono text-xs tabular-nums text-indigo-600 dark:text-indigo-300"
                    >
                        {formatElapsedTime(elapsedSeconds)}
                    </span>
                </button>
            </PopoverTrigger>

            <PopoverContent align="end" className="w-72 p-0">
                <div className="border-b px-4 py-3">
                    <div className="flex items-center gap-2">
                        <Clock className="size-4 text-indigo-600 dark:text-indigo-400" />
                        <span className="text-sm font-medium">Timer Running</span>
                    </div>
                </div>

                <div className="space-y-3 px-4 py-3">
                    <div>
                        <p className="text-xs text-muted-foreground">Task</p>
                        <p className="font-medium">{activeTimer.taskTitle}</p>
                    </div>

                    <div>
                        <p className="text-xs text-muted-foreground">Project</p>
                        <p className="text-sm">{activeTimer.projectName}</p>
                    </div>

                    <div>
                        <p className="text-xs text-muted-foreground">Elapsed Time</p>
                        <p className="font-mono text-lg tabular-nums text-indigo-600 dark:text-indigo-400">
                            {formatElapsedTime(elapsedSeconds)}
                        </p>
                    </div>

                    {activeTimer.isBillable && (
                        <div className="flex items-center gap-1.5">
                            <span className="size-2 rounded-full bg-green-500" />
                            <span className="text-xs text-muted-foreground">Billable</span>
                        </div>
                    )}
                </div>

                <div className="border-t px-4 py-3">
                    <Button
                        variant="destructive"
                        size="sm"
                        className="w-full"
                        onClick={handleStopTimer}
                        disabled={isProcessing}
                        aria-label="Stop timer"
                    >
                        <Square className="size-4" />
                        <span>{isProcessing ? 'Stopping...' : 'Stop Timer'}</span>
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
}

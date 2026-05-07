import { useState, useEffect, useCallback } from 'react';
import { router } from '@inertiajs/react';
import { Play, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TimerConfirmationDialog } from '@/components/workflow/timer-confirmation-dialog';
import type { ActiveTimer } from '@/types';
import { cn } from '@/lib/utils';
import { getCsrfToken } from '@/lib/csrf';

interface TimerControlsProps {
    taskId: number;
    activeTimerForTask?: ActiveTimer | null;
    isBillable?: boolean;
    className?: string;
}

/**
 * API response types for timer start endpoint
 */
interface TimerStartResponse {
    confirmation_required?: boolean;
    blocked?: boolean;
    started?: boolean;
    message?: string;
    current_status?: string;
    time_entry?: {
        id: string;
        task_id: string;
        user_id: string;
        started_at: string;
        is_billable: boolean;
    };
}

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
    return Math.floor((now - startTime) / 1000);
}

/**
 * Reloads the current page while preserving scroll position.
 */
function reloadPage(onFinish?: () => void): void {
    router.visit(window.location.href, {
        preserveScroll: true,
        preserveState: false,
        onFinish,
    });
}

export function TimerControls({
    taskId,
    activeTimerForTask,
    isBillable = true,
    className,
}: TimerControlsProps) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [elapsedSeconds, setElapsedSeconds] = useState(() => {
        if (activeTimerForTask?.startedAt) {
            return calculateElapsedSeconds(activeTimerForTask.startedAt);
        }
        return 0;
    });

    // Confirmation dialog state
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [confirmationStatus, setConfirmationStatus] = useState<string>('');

    const isTimerActive = Boolean(activeTimerForTask);

    // Update elapsed time every second when timer is active
    useEffect(() => {
        if (!activeTimerForTask?.startedAt) {
            setElapsedSeconds(0);
            return;
        }

        // Calculate initial elapsed time
        setElapsedSeconds(calculateElapsedSeconds(activeTimerForTask.startedAt));

        // Set up interval to update every second
        const interval = setInterval(() => {
            setElapsedSeconds(calculateElapsedSeconds(activeTimerForTask.startedAt));
        }, 1000);

        return () => clearInterval(interval);
    }, [activeTimerForTask?.startedAt]);

    /**
     * Initiates timer start - checks if confirmation is required first.
     */
    const handleStartTimer = useCallback(async () => {
        setIsProcessing(true);

        try {
            const response = await fetch(`/work/tasks/${taskId}/timer/start`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-XSRF-TOKEN': getCsrfToken(),
                },
                credentials: 'same-origin',
                body: JSON.stringify({ is_billable: isBillable }),
            });

            const data: TimerStartResponse = await response.json();

            if (data.confirmation_required) {
                // Show confirmation dialog
                setConfirmationStatus(data.current_status ?? '');
                setShowConfirmation(true);
                setIsProcessing(false);
            } else if (data.blocked) {
                // Timer is blocked - reload page to show any server-side errors
                setIsProcessing(false);
                reloadPage();
            } else if (data.started) {
                // Timer started successfully - refresh page to update UI
                reloadPage(() => setIsProcessing(false));
            } else {
                setIsProcessing(false);
            }
        } catch {
            setIsProcessing(false);
            // Fallback to page reload on network error
            reloadPage();
        }
    }, [taskId, isBillable]);

    /**
     * Confirms timer start after user acknowledges status change.
     */
    const handleConfirmStart = useCallback(async () => {
        setIsProcessing(true);
        setShowConfirmation(false);

        try {
            const response = await fetch(`/work/tasks/${taskId}/timer/start?confirmed=true`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-XSRF-TOKEN': getCsrfToken(),
                },
                credentials: 'same-origin',
                body: JSON.stringify({ is_billable: isBillable }),
            });

            const data: TimerStartResponse = await response.json();

            if (data.started) {
                // Timer started successfully - refresh page to update UI
                reloadPage(() => setIsProcessing(false));
            } else if (data.blocked) {
                setIsProcessing(false);
                reloadPage();
            } else {
                setIsProcessing(false);
            }
        } catch {
            setIsProcessing(false);
            reloadPage();
        }
    }, [taskId, isBillable]);

    /**
     * Cancels the confirmation dialog.
     */
    const handleCancelConfirmation = useCallback(() => {
        setShowConfirmation(false);
        setConfirmationStatus('');
    }, []);

    const handleStopTimer = useCallback(() => {
        setIsProcessing(true);
        router.post(
            `/work/tasks/${taskId}/timer/stop`,
            {},
            {
                preserveScroll: true,
                onFinish: () => setIsProcessing(false),
            }
        );
    }, [taskId]);

    if (isTimerActive) {
        return (
            <div className={cn('flex items-center gap-2', className)}>
                <span
                    data-testid="elapsed-time"
                    className="font-mono text-sm tabular-nums text-muted-foreground"
                >
                    {formatElapsedTime(elapsedSeconds)}
                </span>
                <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleStopTimer}
                    disabled={isProcessing}
                    aria-label="Stop timer"
                >
                    <Square className="size-4" />
                    <span>Stop Timer</span>
                </Button>
            </div>
        );
    }

    return (
        <>
            <div className={cn('flex items-center gap-2', className)}>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleStartTimer}
                    disabled={isProcessing}
                    aria-label="Start timer"
                >
                    <Play className="size-4" />
                    <span>Start Timer</span>
                </Button>
            </div>

            <TimerConfirmationDialog
                isOpen={showConfirmation}
                currentStatus={confirmationStatus}
                onConfirm={handleConfirmStart}
                onCancel={handleCancelConfirmation}
                isLoading={isProcessing}
            />
        </>
    );
}


import { TimeEntryForm } from '@/components/time-tracking';
import { cn } from '@/lib/utils';
import type { TimeLogPrompt } from '@/types/work';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Clock } from 'lucide-react';

export interface TimeLogPromptDialogProps {
    /** The task that was just closed with nothing logged, or null to stay shut. */
    prompt: TimeLogPrompt | null;
    /** Called both when the entry is saved and when the user closes without logging. */
    onDismiss: () => void;
}

/**
 * Asks for an estimate of the hours spent on a task that was just closed without
 * any time tracked against it.
 *
 * The close itself has already gone through, so this is never a gate: dismissing
 * leaves the task closed with nothing logged.
 */
function TimeLogPromptDialog({ prompt, onDismiss }: TimeLogPromptDialogProps) {
    if (!prompt) {
        return null;
    }

    return (
        <DialogPrimitive.Root
            open
            onOpenChange={(open) => !open && onDismiss()}
        >
            <DialogPrimitive.Portal>
                <DialogPrimitive.Overlay
                    className={cn(
                        'fixed inset-0 z-50 bg-black/80',
                        'data-[state=closed]:animate-out data-[state=open]:animate-in',
                        'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
                    )}
                />
                <DialogPrimitive.Content
                    className={cn(
                        'fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border bg-background p-6 shadow-lg duration-200 sm:max-w-md',
                        'data-[state=closed]:animate-out data-[state=open]:animate-in',
                        'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
                        'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
                    )}
                >
                    <div className="flex flex-col gap-2 text-center sm:text-left">
                        <div className="flex items-center gap-3">
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
                                <Clock className="size-5 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <DialogPrimitive.Title className="text-lg leading-none font-semibold">
                                How long did this take?
                            </DialogPrimitive.Title>
                        </div>
                        <DialogPrimitive.Description className="text-sm text-muted-foreground">
                            No time was tracked on{' '}
                            <span className="font-medium text-foreground">
                                {prompt.taskTitle}
                            </span>
                            . Estimate the hours you spent so the budget and
                            reports stay accurate.
                        </DialogPrimitive.Description>
                    </div>

                    <TimeEntryForm
                        taskId={prompt.taskId}
                        defaultHours={prompt.estimatedHours ?? undefined}
                        submitLabel="Log time"
                        cancelLabel="Close without logging"
                        onCancel={onDismiss}
                        onSuccess={onDismiss}
                    />
                </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    );
}

export { TimeLogPromptDialog };

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, Bot, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import type { PMCopilotTriggerButtonProps } from '@/types/pm-copilot.d';

/**
 * Trigger button for initiating PM Copilot workflow on a work order.
 * Displays "Generate Plan" button with loading state and feedback alerts.
 */
export function PMCopilotTriggerButton({
    workOrderId,
    onTrigger,
    isRunning = false,
    disabled = false,
    feedbackMessage,
    feedbackError,
    hasExistingPlan = false,
}: PMCopilotTriggerButtonProps) {
    const isDisabled = disabled || isRunning;

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-3 rounded-lg border border-border bg-gradient-to-r from-purple-50/50 to-indigo-50/50 p-4 dark:from-purple-950/20 dark:to-indigo-950/20">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300">
                    <Bot className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium">PM Copilot</h4>
                    <p className="text-xs text-muted-foreground">
                        Generate deliverables and task breakdown with AI assistance
                    </p>
                </div>
                <Button
                    onClick={onTrigger}
                    disabled={isDisabled}
                    className="gap-2"
                    aria-label={isRunning ? 'Generating plan' : hasExistingPlan ? 'Regenerate Plan' : 'Generate Plan'}
                >
                    {isRunning ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Generating...</span>
                        </>
                    ) : (
                        <>
                            <Sparkles className="h-4 w-4" />
                            <span>{hasExistingPlan ? 'Regenerate Plan' : 'Generate Plan'}</span>
                        </>
                    )}
                </Button>
            </div>

            {feedbackError ? (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{feedbackError}</AlertDescription>
                </Alert>
            ) : feedbackMessage ? (
                <Alert className="border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950/30 dark:text-green-300">
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertDescription>{feedbackMessage}</AlertDescription>
                </Alert>
            ) : null}
        </div>
    );
}

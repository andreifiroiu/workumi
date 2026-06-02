import * as React from 'react';
import { ChevronDownIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

/**
 * Represents a valid status transition option
 */
export interface TransitionOption {
    /** The status value to transition to */
    value: string;
    /** Human-readable label for the transition */
    label: string;
    /** Optional description for the transition */
    description?: string;
    /** Whether this transition is destructive (e.g., cancel) */
    destructive?: boolean;
}

export interface TransitionButtonProps {
    /** Current status of the item */
    currentStatus: string;
    /** List of allowed transitions from current status */
    allowedTransitions: TransitionOption[];
    /** Callback when a transition is selected */
    onTransition: (targetStatus: string) => void;
    /** Whether the button is in a loading/processing state */
    isLoading?: boolean;
    /** Whether the button should be disabled */
    disabled?: boolean;
    /** Additional className for the trigger button */
    className?: string;
    /** Size variant for the button */
    size?: 'default' | 'sm' | 'lg';
}

/**
 * TransitionButton provides a dropdown menu for status transitions.
 * It only displays valid transitions based on the allowedTransitions prop.
 */
function TransitionButton({
    allowedTransitions,
    onTransition,
    isLoading = false,
    disabled = false,
    className,
    size = 'default',
}: TransitionButtonProps) {
    const hasTransitions = allowedTransitions.length > 0;

    const handleSelect = (targetStatus: string) => {
        onTransition(targetStatus);
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    size={size}
                    disabled={disabled || isLoading || !hasTransitions}
                    className={cn('gap-1', className)}
                    aria-label="Change status"
                >
                    {isLoading ? (
                        <span className="animate-pulse">Updating...</span>
                    ) : (
                        <>
                            Change Status
                            <ChevronDownIcon className="size-4" aria-hidden="true" />
                        </>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[160px]">
                {allowedTransitions.map((transition) => (
                    <DropdownMenuItem
                        key={transition.value}
                        onClick={() => handleSelect(transition.value)}
                        variant={transition.destructive ? 'destructive' : 'default'}
                        className="cursor-pointer"
                    >
                        <div className="flex flex-col gap-0.5">
                            <span>{transition.label}</span>
                            {transition.description && (
                                <span className="text-muted-foreground text-xs">
                                    {transition.description}
                                </span>
                            )}
                        </div>
                    </DropdownMenuItem>
                ))}
                {!hasTransitions && (
                    <DropdownMenuItem disabled>No transitions available</DropdownMenuItem>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export { TransitionButton };

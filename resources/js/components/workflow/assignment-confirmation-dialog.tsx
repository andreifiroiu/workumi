import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { AlertTriangle, ArrowRight, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

/** RACI role type for display */
export type AssignmentRole = 'Responsible' | 'Accountable' | 'Consulted' | 'Informed';

/** User assignment information */
export interface AssignmentUser {
    id: number;
    name: string;
    avatar?: string;
}

/** Assignment change information. A null user represents "no one assigned". */
export interface AssignmentChange {
    role: AssignmentRole;
    user: AssignmentUser | null;
}

export interface AssignmentConfirmationDialogProps {
    /** Whether the dialog is open */
    isOpen: boolean;
    /** The current assignment being replaced */
    currentAssignment: AssignmentChange;
    /** The new assignment being made */
    newAssignment: AssignmentChange;
    /** Callback when user confirms the change */
    onConfirm: () => void;
    /** Callback when user cancels the change */
    onCancel: () => void;
    /** Whether the confirmation is in progress */
    isLoading?: boolean;
}

/**
 * Resolves a RACI role and user id into the shape the dialog renders.
 *
 * A null userId means the slot is unassigned, which is a change worth
 * confirming just like a replacement — it resolves to a null user rather than
 * failing to resolve.
 *
 * Returns null only when the id cannot be matched to a known user.
 */
function resolveAssignmentChange(
    role: string,
    userId: number | null,
    users: AssignmentUser[],
): AssignmentChange | null {
    const roleLabel = (role.charAt(0).toUpperCase() +
        role.slice(1)) as AssignmentRole;

    if (userId === null) {
        return { role: roleLabel, user: null };
    }

    const user = users.find((u) => u.id === userId);

    return user ? { role: roleLabel, user } : null;
}

/**
 * Gets initials from a user name.
 */
function getInitials(name: string): string {
    return name
        .split(' ')
        .map((part) => part[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

/**
 * User display component with avatar and name. Renders an "Unassigned"
 * placeholder when there is no user for the slot.
 */
function UserDisplay({ user }: { user: AssignmentUser | null }) {
    if (!user) {
        return (
            <div className="flex items-center gap-3">
                <Avatar className="size-10">
                    <AvatarFallback className="text-muted-foreground text-sm">
                        <UserX className="size-4" />
                    </AvatarFallback>
                </Avatar>
                <span className="text-muted-foreground font-medium">Unassigned</span>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-3">
            <Avatar className="size-10">
                {user.avatar && <AvatarImage src={user.avatar} alt={user.name} />}
                <AvatarFallback className="text-sm">{getInitials(user.name)}</AvatarFallback>
            </Avatar>
            <span className="font-medium">{user.name}</span>
        </div>
    );
}

/**
 * AssignmentConfirmationDialog displays an alert dialog asking the user to confirm
 * changing an existing RACI assignment.
 *
 * Uses Radix Dialog primitive with alertdialog role for proper accessibility.
 */
function AssignmentConfirmationDialog({
    isOpen,
    currentAssignment,
    newAssignment,
    onConfirm,
    onCancel,
    isLoading = false,
}: AssignmentConfirmationDialogProps) {
    const isRemoval = newAssignment.user === null;

    return (
        <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => !open && onCancel()}>
            <DialogPrimitive.Portal>
                <DialogPrimitive.Overlay
                    className={cn(
                        'fixed inset-0 z-50 bg-black/80',
                        'data-[state=open]:animate-in data-[state=closed]:animate-out',
                        'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0'
                    )}
                />
                <DialogPrimitive.Content
                    role="alertdialog"
                    aria-describedby="assignment-confirmation-description"
                    aria-labelledby="assignment-confirmation-title"
                    onPointerDownOutside={(e) => e.preventDefault()}
                    onEscapeKeyDown={(e) => {
                        if (!isLoading) {
                            onCancel();
                        } else {
                            e.preventDefault();
                        }
                    }}
                    className={cn(
                        'bg-background fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 sm:max-w-md',
                        'data-[state=open]:animate-in data-[state=closed]:animate-out',
                        'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
                        'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95'
                    )}
                >
                    <div className="flex flex-col gap-4">
                        {/* Header */}
                        <div className="flex items-center gap-3">
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                                <AlertTriangle className="size-5 text-amber-600 dark:text-amber-500" />
                            </div>
                            <DialogPrimitive.Title
                                id="assignment-confirmation-title"
                                className="text-lg font-semibold leading-none"
                            >
                                {isRemoval ? 'Remove' : 'Change'}{' '}
                                {currentAssignment.role}?
                            </DialogPrimitive.Title>
                        </div>

                        {/* Description */}
                        <DialogPrimitive.Description
                            id="assignment-confirmation-description"
                            className="text-muted-foreground text-sm"
                        >
                            This will {isRemoval ? 'clear' : 'replace'} the current{' '}
                            <span className="font-medium text-foreground">
                                {currentAssignment.role}
                            </span>{' '}
                            assignment. Are you sure you want to make this change?
                        </DialogPrimitive.Description>

                        {/* Assignment Change Visualization */}
                        <div className="bg-muted/50 rounded-lg p-4">
                            <div className="flex items-center justify-between gap-4">
                                <div className="min-w-0 flex-1">
                                    <p className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">
                                        Current
                                    </p>
                                    <UserDisplay user={currentAssignment.user} />
                                </div>
                                <ArrowRight className="text-muted-foreground size-5 shrink-0" />
                                <div className="min-w-0 flex-1">
                                    <p className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">
                                        New
                                    </p>
                                    <UserDisplay user={newAssignment.user} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <Button variant="outline" onClick={onCancel} disabled={isLoading}>
                            Cancel
                        </Button>
                        <Button onClick={onConfirm} disabled={isLoading}>
                            {isLoading ? 'Confirming...' : 'Confirm'}
                        </Button>
                    </div>
                </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    );
}

export { AssignmentConfirmationDialog, resolveAssignmentChange };

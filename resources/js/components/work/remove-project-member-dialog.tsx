import ProjectMemberController from '@/actions/App/Http/Controllers/Work/ProjectMemberController';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { ProjectTeamMember } from '@/types/work';
import { router } from '@inertiajs/react';
import { useState } from 'react';

interface RemoveProjectMemberDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    projectId: string;
    member: ProjectTeamMember | null;
    /** True when the member being removed is the signed-in user. */
    isSelf: boolean;
}

export function RemoveProjectMemberDialog({
    open,
    onOpenChange,
    projectId,
    member,
    isSelf,
}: RemoveProjectMemberDialogProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Access can also come from a RACI role, which this action does not touch.
    const keepsAccessViaRaci =
        member?.roles.some((role) => role.role !== 'member') ?? false;

    const handleRemove = () => {
        if (!member) {
            return;
        }

        setIsSubmitting(true);

        router.delete(
            ProjectMemberController.destroy.url({
                project: Number(projectId),
                user: Number(member.id),
            }),
            {
                preserveScroll: true,
                onSuccess: () => onOpenChange(false),
                onFinish: () => setIsSubmitting(false),
            },
        );
    };

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>
                        {isSelf ? 'Leave this project?' : 'Remove from project'}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        {isSelf ? (
                            <>
                                You will lose access to this project and be
                                taken back to Work.
                            </>
                        ) : (
                            <>
                                <strong>{member?.name}</strong> will lose access
                                to this project and everything inside it.
                            </>
                        )}
                        {keepsAccessViaRaci && (
                            <>
                                {' '}
                                Note that {isSelf ? 'you' : 'they'} also hold a
                                RACI role here, which keeps{' '}
                                {isSelf ? 'your' : 'their'} access. Change that
                                in the project's RACI assignments.
                            </>
                        )}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isSubmitting}>
                        Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleRemove}
                        disabled={isSubmitting}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                        {isSubmitting
                            ? 'Removing...'
                            : isSelf
                              ? 'Leave project'
                              : 'Remove'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

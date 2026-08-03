import { router } from '@inertiajs/react';
import { useState } from 'react';
import { Mail, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
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
import type { TeamInvitation } from '@/types/settings';

interface PendingInvitationsSectionProps {
    invitations: TeamInvitation[];
    canManageTeam: boolean;
}

export function PendingInvitationsSection({
    invitations,
    canManageTeam,
}: PendingInvitationsSectionProps) {
    const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
    const [selectedInvitation, setSelectedInvitation] = useState<TeamInvitation | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const handleCancelClick = (invitation: TeamInvitation) => {
        setSelectedInvitation(invitation);
        setCancelDialogOpen(true);
    };

    const handleCancelInvitation = () => {
        if (!selectedInvitation) return;

        setIsSubmitting(true);

        router.delete(`/settings/invitations/${selectedInvitation.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                setIsSubmitting(false);
                setCancelDialogOpen(false);
                setSelectedInvitation(null);
            },
            onError: () => {
                setIsSubmitting(false);
            },
        });
    };

    if (invitations.length === 0) {
        return null;
    }

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Mail className="h-5 w-5" />
                        Pending Invitations
                    </CardTitle>
                    <CardDescription>
                        Invitations that have been sent but not yet accepted
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Email</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Sent</TableHead>
                                {canManageTeam && <TableHead className="w-[100px]">Actions</TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {invitations.map((invitation) => (
                                <TableRow key={invitation.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-medium">
                                                {invitation.email.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="text-muted-foreground">
                                                {invitation.email}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{invitation.role}</Badge>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {formatDate(invitation.createdAt)}
                                    </TableCell>
                                    {canManageTeam && (
                                        <TableCell>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleCancelClick(invitation)}
                                                className="text-destructive hover:text-destructive"
                                            >
                                                <X className="mr-1 h-4 w-4" />
                                                Cancel
                                            </Button>
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Cancel Invitation</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to cancel the invitation to{' '}
                            <strong>{selectedInvitation?.email}</strong>? They will no longer be
                            able to join your team using the invitation link.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isSubmitting}>Keep Invitation</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleCancelInvitation}
                            disabled={isSubmitting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isSubmitting ? 'Cancelling...' : 'Cancel Invitation'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

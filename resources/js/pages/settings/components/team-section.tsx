import { useState } from 'react';
import { MoreHorizontal, UserPlus, Crown, Trash2 } from 'lucide-react';
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
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { InviteMemberModal } from './invite-member-modal';
import { RemoveMemberDialog } from './remove-member-dialog';
import { PendingInvitationsSection } from './pending-invitations-section';
import type { TeamMember, TeamInvitation, TeamRole } from '@/types/settings';

interface TeamSectionProps {
    members: TeamMember[];
    pendingInvitations: TeamInvitation[];
    teamRoles: TeamRole[];
    canManageTeam: boolean;
    currentUserId: number;
}

export function TeamSection({
    members,
    pendingInvitations,
    teamRoles,
    canManageTeam,
    currentUserId,
}: TeamSectionProps) {
    const [inviteModalOpen, setInviteModalOpen] = useState(false);
    const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
    const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const handleRemoveClick = (member: TeamMember) => {
        setSelectedMember(member);
        setRemoveDialogOpen(true);
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <div>
                        <CardTitle>Team Members</CardTitle>
                        <CardDescription>
                            Manage your team members, roles, and permissions
                        </CardDescription>
                    </div>
                    {canManageTeam && (
                        <Button onClick={() => setInviteModalOpen(true)}>
                            <UserPlus className="mr-2 h-4 w-4" />
                            Invite Member
                        </Button>
                    )}
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Member</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Joined</TableHead>
                                <TableHead>Last Active</TableHead>
                                {canManageTeam && <TableHead className="w-[70px]" />}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {members.map((member) => (
                                <TableRow key={member.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-medium">
                                                {member.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium">{member.name}</span>
                                                    {member.isOwner && (
                                                        <Crown className="h-4 w-4 text-amber-500" />
                                                    )}
                                                    {member.id === currentUserId && (
                                                        <Badge variant="outline" className="text-xs">
                                                            You
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="text-sm text-muted-foreground">
                                                    {member.email}
                                                </div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary">{member.role}</Badge>
                                    </TableCell>
                                    <TableCell>{formatDate(member.joinedAt)}</TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {formatDate(member.lastActiveAt)}
                                    </TableCell>
                                    {canManageTeam && (
                                        <TableCell>
                                            {!member.isOwner && member.id !== currentUserId && (
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                            <span className="sr-only">Actions</span>
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            onClick={() => handleRemoveClick(member)}
                                                            className="text-destructive focus:text-destructive"
                                                        >
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            Remove from team
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            )}
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <PendingInvitationsSection
                invitations={pendingInvitations}
                canManageTeam={canManageTeam}
            />

            <InviteMemberModal
                open={inviteModalOpen}
                onOpenChange={setInviteModalOpen}
                roles={teamRoles}
            />

            <RemoveMemberDialog
                open={removeDialogOpen}
                onOpenChange={setRemoveDialogOpen}
                member={selectedMember}
            />
        </div>
    );
}

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import type { SharedData } from '@/types';
import type {
    ProjectAssignableUser,
    ProjectTeamMember,
    TeamMemberRole,
} from '@/types/work';
import { usePage } from '@inertiajs/react';
import { ChevronDown, ChevronRight, UserPlus, Users, X } from 'lucide-react';
import { useState } from 'react';
import { AddProjectMemberDialog } from './add-project-member-dialog';
import { RemoveProjectMemberDialog } from './remove-project-member-dialog';
import { RoleBadge } from './role-badge';

interface ProjectTeamSectionProps {
    teamMembers: ProjectTeamMember[];
    projectId: string;
    isPrivate: boolean;
    canManageMembers: boolean;
    assignableUsers: ProjectAssignableUser[];
}

function getInitials(name: string): string {
    return name
        .split(' ')
        .map((word) => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

function getUniqueRoles(roles: TeamMemberRole[]): TeamMemberRole['role'][] {
    const uniqueRoles = new Set(roles.map((r) => r.role));
    // Priority order for displaying roles
    const roleOrder: TeamMemberRole['role'][] = [
        'owner',
        'accountable',
        'responsible',
        'assigned',
        'reviewer',
        'consulted',
        'informed',
        'member',
    ];
    return roleOrder.filter((role) => uniqueRoles.has(role));
}

function formatWorkload(workload: ProjectTeamMember['workload']): string {
    const parts: string[] = [];
    if (workload.workOrdersCount > 0) {
        parts.push(`${workload.workOrdersCount} WO${workload.workOrdersCount !== 1 ? 's' : ''}`);
    }
    if (workload.tasksCount > 0) {
        parts.push(`${workload.tasksCount} task${workload.tasksCount !== 1 ? 's' : ''}`);
    }
    if (workload.totalEstimatedHours > 0) {
        parts.push(`${workload.totalEstimatedHours}h estimated`);
    }
    return parts.join(' • ');
}

export function ProjectTeamSection({
    teamMembers,
    projectId,
    isPrivate,
    canManageMembers,
    assignableUsers,
}: ProjectTeamSectionProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [memberToRemove, setMemberToRemove] =
        useState<ProjectTeamMember | null>(null);
    const currentUserId = usePage<SharedData>().props.auth.user?.id;

    // Adding people only changes who can get in when the project is private.
    const showAddAction = canManageMembers && isPrivate;

    if (teamMembers.length === 0 && !showAddAction) {
        return null;
    }

    const displayedAvatars = teamMembers.slice(0, 5);
    const remainingCount = teamMembers.length - displayedAvatars.length;

    // Offer anyone who cannot currently reach the project. Filtering on the team list instead
    // would hide work order assignees, who appear there but have no access to grant.
    const candidates = assignableUsers.filter((user) => !user.hasAccess);

    return (
        <>
            <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
                <div className="mb-4 rounded-lg border border-border bg-card">
                    {/* The trigger wraps only the label side: a nested button would be invalid
                        markup and clicking it would toggle the collapsible. */}
                    <div className="flex items-center gap-2 pr-2">
                        <CollapsibleTrigger asChild>
                            <Button
                                variant="ghost"
                                className="h-auto flex-1 justify-between px-4 py-3 hover:bg-muted/50"
                            >
                                <div className="flex items-center gap-3">
                                    <Users className="h-5 w-5 text-muted-foreground" />
                                    <span className="font-medium">Team ({teamMembers.length})</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    {/* Avatar Stack - only shown when collapsed */}
                                    {!isExpanded && (
                                        <div className="flex -space-x-2">
                                            {displayedAvatars.map((member) => (
                                                <Avatar
                                                    key={member.id}
                                                    className="h-7 w-7 border-2 border-card"
                                                >
                                                    <AvatarImage src={member.avatarUrl ?? undefined} alt={member.name} />
                                                    <AvatarFallback className="text-[10px]">
                                                        {getInitials(member.name)}
                                                    </AvatarFallback>
                                                </Avatar>
                                            ))}
                                            {remainingCount > 0 && (
                                                <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-card bg-muted text-[10px] font-medium">
                                                    +{remainingCount}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {isExpanded ? (
                                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                    ) : (
                                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                    )}
                                </div>
                            </Button>
                        </CollapsibleTrigger>

                        {showAddAction && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="shrink-0"
                                onClick={() => setAddDialogOpen(true)}
                                data-testid="add-project-member"
                            >
                                <UserPlus className="mr-2 h-4 w-4" />
                                Add member
                            </Button>
                        )}
                    </div>

                    <CollapsibleContent>
                        <div className="border-t border-border px-4 py-3">
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                                {teamMembers.map((member) => (
                                    <TeamMemberCard
                                        key={member.id}
                                        member={member}
                                        onRemove={setMemberToRemove}
                                    />
                                ))}
                            </div>
                        </div>
                    </CollapsibleContent>
                </div>
            </Collapsible>

            <AddProjectMemberDialog
                open={addDialogOpen}
                onOpenChange={setAddDialogOpen}
                projectId={projectId}
                candidates={candidates}
            />

            <RemoveProjectMemberDialog
                open={memberToRemove !== null}
                onOpenChange={(open) => !open && setMemberToRemove(null)}
                projectId={projectId}
                member={memberToRemove}
                isSelf={memberToRemove?.id === String(currentUserId)}
            />
        </>
    );
}

interface TeamMemberCardProps {
    member: ProjectTeamMember;
    onRemove: (member: ProjectTeamMember) => void;
}

function TeamMemberCard({ member, onRemove }: TeamMemberCardProps) {
    const uniqueRoles = getUniqueRoles(member.roles);
    const workloadText = formatWorkload(member.workload);

    return (
        <div className="group flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-3">
            <Avatar className="h-10 w-10 shrink-0">
                <AvatarImage src={member.avatarUrl ?? undefined} alt={member.name} />
                <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
                <div className="font-medium text-sm truncate">{member.name}</div>
                <div className="flex flex-wrap gap-1 mt-1">
                    {uniqueRoles.map((role) => (
                        <RoleBadge key={role} role={role} />
                    ))}
                </div>
                {workloadText && (
                    <div className="text-xs text-muted-foreground mt-1.5 truncate">
                        {workloadText}
                    </div>
                )}
            </div>
            {member.canRemove && (
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
                    onClick={() => onRemove(member)}
                    aria-label={`Remove ${member.name} from project`}
                >
                    <X className="h-4 w-4" />
                </Button>
            )}
        </div>
    );
}

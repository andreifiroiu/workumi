import { useState } from 'react';
import { ChevronDown, ChevronRight, Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { RoleBadge } from './role-badge';
import type { ProjectTeamMember, TeamMemberRole } from '@/types/work';

interface ProjectTeamSectionProps {
    teamMembers: ProjectTeamMember[];
    projectId: string;
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
    return parts.join(' \u2022 ');
}

export function ProjectTeamSection({ teamMembers }: ProjectTeamSectionProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    if (teamMembers.length === 0) {
        return null;
    }

    const displayedAvatars = teamMembers.slice(0, 5);
    const remainingCount = teamMembers.length - displayedAvatars.length;

    return (
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <div className="mb-4 rounded-lg border border-border bg-card">
                <CollapsibleTrigger asChild>
                    <Button
                        variant="ghost"
                        className="w-full justify-between px-4 py-3 h-auto hover:bg-muted/50"
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

                <CollapsibleContent>
                    <div className="border-t border-border px-4 py-3">
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                            {teamMembers.map((member) => (
                                <TeamMemberCard key={member.id} member={member} />
                            ))}
                        </div>
                    </div>
                </CollapsibleContent>
            </div>
        </Collapsible>
    );
}

interface TeamMemberCardProps {
    member: ProjectTeamMember;
}

function TeamMemberCard({ member }: TeamMemberCardProps) {
    const uniqueRoles = getUniqueRoles(member.roles);
    const workloadText = formatWorkload(member.workload);

    return (
        <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-3">
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
        </div>
    );
}

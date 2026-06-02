import { Folder, Lock } from 'lucide-react';
import { Link } from '@inertiajs/react';
import { StatusBadge } from './status-badge';
import { ProgressBar } from './progress-bar';
import { RaciBadgeGroup, getProminenceClass } from './raci-badge';
import { cn } from '@/lib/utils';
import type { Project, RaciRole, MyWorkFiltersState, SortBy, SortDirection } from '@/types/work';

interface MyWorkProjectsListProps {
    projects: Array<Project & { userRaciRoles: RaciRole[] }>;
    filters: MyWorkFiltersState;
    showInformed: boolean;
    className?: string;
}

export function MyWorkProjectsList({ projects, filters, showInformed, className }: MyWorkProjectsListProps) {
    // Apply filters
    let filteredProjects = [...projects];

    // Filter out informed items unless showInformed is true
    if (!showInformed) {
        filteredProjects = filteredProjects.filter(
            (p) => !p.userRaciRoles.every((role) => role === 'informed')
        );
    }

    // Filter by RACI roles
    if (filters.raciRoles.length > 0) {
        filteredProjects = filteredProjects.filter((p) =>
            p.userRaciRoles.some((role) => filters.raciRoles.includes(role))
        );
    }

    // Filter by status
    if (filters.statuses.length > 0) {
        filteredProjects = filteredProjects.filter((p) => filters.statuses.includes(p.status));
    }

    // Apply sorting
    filteredProjects = sortProjects(filteredProjects, filters.sortBy, filters.sortDirection);

    // Group by status
    const activeProjects = filteredProjects.filter((p) => p.status === 'active');
    const onHoldProjects = filteredProjects.filter((p) => p.status === 'on_hold');
    const completedProjects = filteredProjects.filter((p) => p.status === 'completed');

    const isEmpty = filteredProjects.length === 0;

    if (isEmpty) {
        return (
            <div className={cn('p-8 text-center text-muted-foreground', className)}>
                <p>No projects match your current filters.</p>
            </div>
        );
    }

    return (
        <div className={cn('space-y-8', className)}>
            {activeProjects.length > 0 && (
                <ProjectSection title="Active" projects={activeProjects} />
            )}
            {onHoldProjects.length > 0 && (
                <ProjectSection title="On Hold" projects={onHoldProjects} color="amber" />
            )}
            {completedProjects.length > 0 && (
                <ProjectSection title="Completed" projects={completedProjects} color="muted" />
            )}
        </div>
    );
}

interface ProjectSectionProps {
    title: string;
    projects: Array<Project & { userRaciRoles: RaciRole[] }>;
    color?: 'amber' | 'muted';
}

function ProjectSection({ title, projects, color }: ProjectSectionProps) {
    const colorClasses: Record<string, string> = {
        amber: 'text-amber-600 dark:text-amber-400',
        muted: 'text-muted-foreground',
    };

    const titleColorClass = color ? colorClasses[color] : 'text-foreground';

    return (
        <div>
            <h3 className={cn('text-lg font-bold mb-4', titleColorClass)}>
                {title} <span className="text-sm font-medium text-muted-foreground">({projects.length})</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {projects.map((project) => (
                    <ProjectCard key={project.id} project={project} />
                ))}
            </div>
        </div>
    );
}

interface ProjectCardProps {
    project: Project & { userRaciRoles: RaciRole[] };
}

function ProjectCard({ project }: ProjectCardProps) {
    const prominenceClass = getProminenceClass(project.userRaciRoles);
    const isInformedOnly = project.userRaciRoles.every((role) => role === 'informed');

    const totalWorkOrders =
        (project.workOrderLists?.reduce((sum, list) => sum + list.workOrders.length, 0) ?? 0) +
        (project.ungroupedWorkOrders?.length ?? 0);

    return (
        <Link
            href={`/work/projects/${project.id}`}
            className={cn(
                'block w-full text-left p-5 bg-card border border-border rounded-lg hover:shadow-md transition-all group',
                prominenceClass && `border-l-4 ${prominenceClass}`,
                isInformedOnly && 'opacity-60'
            )}
        >
            <div className="flex items-start gap-3 mb-3">
                <div className="p-2 rounded-lg bg-primary/10">
                    <Folder className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <StatusBadge status={project.status} type="project" />
                        <RaciBadgeGroup roles={project.userRaciRoles} />
                    </div>
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate flex items-center gap-1">
                        {project.name}
                        {project.isPrivate && (
                            <Lock className="h-3 w-3 text-muted-foreground flex-shrink-0" title="Private project" />
                        )}
                    </h3>
                    <p className="text-sm text-muted-foreground truncate">{project.partyName}</p>
                </div>
            </div>

            <div className="mb-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>Progress</span>
                    <span className="font-medium">{project.progress}%</span>
                </div>
                <ProgressBar progress={project.progress} />
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{totalWorkOrders} work orders</span>
                {project.budgetHours && (
                    <span>
                        {project.actualHours}/{project.budgetHours}h
                    </span>
                )}
            </div>

            {project.tags && project.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                    {project.tags.slice(0, 3).map((tag) => (
                        <span
                            key={tag}
                            className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                        >
                            {tag}
                        </span>
                    ))}
                    {project.tags.length > 3 && (
                        <span className="text-xs text-muted-foreground">
                            +{project.tags.length - 3} more
                        </span>
                    )}
                </div>
            )}
        </Link>
    );
}

// Helper function for sorting
function sortProjects(
    projects: Array<Project & { userRaciRoles: RaciRole[] }>,
    sortBy: SortBy,
    direction: SortDirection
): Array<Project & { userRaciRoles: RaciRole[] }> {
    const raciOrder: Record<string, number> = { accountable: 0, responsible: 1, consulted: 2, informed: 3 };

    const sorted = [...projects].sort((a, b) => {
        let comparison = 0;

        switch (sortBy) {
            case 'due_date':
                // Projects use targetEndDate
                if (!a.targetEndDate && !b.targetEndDate) comparison = 0;
                else if (!a.targetEndDate) comparison = 1;
                else if (!b.targetEndDate) comparison = -1;
                else comparison = new Date(a.targetEndDate).getTime() - new Date(b.targetEndDate).getTime();
                break;
            case 'priority': {
                // Sort by RACI prominence for projects
                const aHighestRoleP = Math.min(...a.userRaciRoles.map((r) => raciOrder[r]));
                const bHighestRoleP = Math.min(...b.userRaciRoles.map((r) => raciOrder[r]));
                comparison = aHighestRoleP - bHighestRoleP;
                break;
            }
            case 'recently_updated':
                // Sort by start date as proxy for recency
                comparison = new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
                break;
            case 'alphabetical':
                comparison = a.name.localeCompare(b.name);
                break;
        }

        // Secondary sort by RACI prominence
        if (comparison === 0) {
            const aHighestRole = Math.min(...a.userRaciRoles.map((r) => raciOrder[r]));
            const bHighestRole = Math.min(...b.userRaciRoles.map((r) => raciOrder[r]));
            comparison = aHighestRole - bHighestRole;
        }

        return direction === 'asc' ? comparison : -comparison;
    });

    return sorted;
}

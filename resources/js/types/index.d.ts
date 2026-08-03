import { InertiaLinkProps } from '@inertiajs/react';
import { LucideIcon } from 'lucide-react';
import { Organization } from './workumi';

/** A user's role within their current team. */
export type TeamRoleCode = 'owner' | 'admin' | 'member' | 'viewer';

export interface AuthTeam {
    id: number;
    /** Team membership role. Not to be confused with `User.role`, a job title. */
    roleCode: TeamRoleCode | null;
    isOwner: boolean;
}

export interface AuthAbilities {
    /** Owner or admin: workspace settings, AI agents, API keys, billing. */
    administerTeam: boolean;
    /** Anyone but a viewer: create and modify projects, tasks, work orders. */
    writeContent: boolean;
}

export interface Auth {
    user: User | null;
    team: AuthTeam | null;
    can: AuthAbilities;
}

export interface BreadcrumbItem {
    title: string;
    href: string;
    siblings?: { title: string; href: string }[];
}

export interface NavGroup {
    title: string;
    items: NavItem[];
}

export interface NavItem {
    title: string;
    href: NonNullable<InertiaLinkProps['href']>;
    icon?: LucideIcon | null;
    isActive?: boolean;
    /** Hide this item unless the viewer holds the named ability. */
    requires?: keyof AuthAbilities;
}

export interface ActiveTimer {
    id: number;
    taskId: number;
    taskTitle: string;
    projectName: string;
    startedAt: string;
    isBillable: boolean;
}

export interface SharedData {
    name: string;
    quote: { message: string; author: string };
    auth: Auth;
    sidebarOpen: boolean;
    currentOrganization: Organization | null;
    organizations: Organization[];
    locale: string;
    availableLocales: string[];
    activeTimer: ActiveTimer | null;
    [key: string]: unknown;
}

export interface User {
    id: number;
    name: string;
    email: string;
    avatar?: string;
    email_verified_at: string | null;
    two_factor_enabled?: boolean;
    /** Free-text job title. NOT an authorization role — use auth.team.roleCode. */
    role?: string | null;
    timezone: string;
    language: string;
    created_at: string;
    updated_at: string;
    [key: string]: unknown; // This allows for additional properties...
}

import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { OrganizationSwitcher } from '@/components/organization-switcher';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { usePermissions } from '@/hooks/use-permissions';
import { type NavItem, type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import {
    BarChart3,
    BookOpen,
    Briefcase,
    FileText,
    Folder,
    Home,
    Inbox,
    ListChecks,
    MessageSquare,
    Settings,
    Users,
} from 'lucide-react';
import { useMemo } from 'react';
import AppLogo from './app-logo';

const mainNavItems: NavItem[] = [
    {
        title: 'Today',
        href: '/today',
        icon: Home,
    },
    {
        title: 'Work',
        href: '/work',
        icon: Briefcase,
    },
    {
        title: 'Review',
        href: '/review',
        icon: ListChecks,
    },
    {
        title: 'Inbox',
        href: '/inbox',
        icon: Inbox,
    },
    {
        title: 'Communications',
        href: '/communications',
        icon: MessageSquare,
    },
    {
        title: 'Documents',
        href: '/documents',
        icon: FileText,
    },
    {
        title: 'Playbooks',
        href: '/playbooks',
        icon: BookOpen,
    },
    {
        title: 'Directory',
        href: '/directory',
        icon: Users,
    },
    {
        title: 'Reports',
        href: '/reports',
        icon: BarChart3,
    },
    {
        title: 'Settings',
        href: '/settings',
        icon: Settings,
        requires: 'administerTeam',
    },
];

const footerNavItems: NavItem[] = [
    {
        title: 'Documentation',
        href: 'https://workumi.dev/docs',
        icon: Folder,
    },
];

export function AppSidebar() {
    const { currentOrganization, organizations } = usePage<SharedData>().props;
    const { can } = usePermissions();

    // Hide entries the user cannot reach, so they never click into a 403.
    const visibleNavItems = useMemo(
        () => mainNavItems.filter((item) => !item.requires || can[item.requires]),
        [can],
    );

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="/today" prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
                <OrganizationSwitcher
                    currentOrganization={currentOrganization}
                    organizations={organizations}
                    className="mt-2"
                />
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={visibleNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}

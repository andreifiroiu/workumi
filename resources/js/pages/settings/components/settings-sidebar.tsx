import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { Link, router } from '@inertiajs/react';
import {
    Bot,
    CreditCard,
    DollarSign,
    FileText,
    Key,
    Plug,
    Settings,
    Users,
} from 'lucide-react';

interface SettingsNavItem {
    title: string;
    value: string;
    href?: string;
    icon: React.ComponentType<{ className?: string }>;
}

const settingsNavItems: SettingsNavItem[] = [
    { title: 'Workspace', value: 'workspace', icon: Settings },
    { title: 'Team & Permissions', value: 'team', icon: Users },
    {
        title: 'Rates',
        value: 'rates',
        href: '/account/settings/rates',
        icon: DollarSign,
    },
    { title: 'AI Agents', value: 'ai-agents', icon: Bot },
    { title: 'API Keys', value: 'api-keys', icon: Key },
    { title: 'Integrations', value: 'integrations', icon: Plug },
    { title: 'Billing', value: 'billing', icon: CreditCard },
    { title: 'Audit Log', value: 'audit-log', icon: FileText },
];

function isItemActive(
    item: SettingsNavItem,
    activeTab: string,
    currentPath: string,
): boolean {
    // For items with custom href, check if current path matches
    if (item.href) {
        return currentPath === item.href;
    }
    // For tab-based items, check the query param
    return activeTab === item.value;
}

function getItemHref(item: SettingsNavItem): string {
    return item.href ?? `/settings?tab=${item.value}`;
}

/**
 * Section switcher shown in place of the sidebar on mobile so settings sections
 * stay reachable without a nested sidebar or a horizontally scrolling tab row.
 */
export function SettingsMobileNav() {
    const searchParams = new URLSearchParams(window.location.search);
    const activeTab = searchParams.get('tab') || 'workspace';
    const currentPath = window.location.pathname;

    const activeItem =
        settingsNavItems.find((item) =>
            isItemActive(item, activeTab, currentPath),
        ) ?? settingsNavItems[0];

    return (
        <div className="border-b border-border pb-3 md:hidden">
            <Select
                value={activeItem.value}
                onValueChange={(value) => {
                    const item = settingsNavItems.find(
                        (i) => i.value === value,
                    );
                    if (item) {
                        router.visit(getItemHref(item), {
                            preserveScroll: true,
                        });
                    }
                }}
            >
                <SelectTrigger className="w-full">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {settingsNavItems.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                            <span className="flex items-center gap-2">
                                <item.icon className="h-4 w-4" />
                                {item.title}
                            </span>
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}

export function SettingsSidebar() {
    const searchParams = new URLSearchParams(window.location.search);
    const activeTab = searchParams.get('tab') || 'workspace';
    const currentPath = window.location.pathname;

    return (
        <Sidebar collapsible="none" className="border-r border-border">
            <SidebarContent>
                <SidebarGroup className="px-2 py-4">
                    <SidebarGroupLabel>Settings</SidebarGroupLabel>
                    <SidebarMenu>
                        {settingsNavItems.map((item) => (
                            <SidebarMenuItem key={item.value}>
                                <SidebarMenuButton
                                    asChild
                                    isActive={isItemActive(
                                        item,
                                        activeTab,
                                        currentPath,
                                    )}
                                >
                                    <Link
                                        href={getItemHref(item)}
                                        preserveScroll
                                    >
                                        <item.icon />
                                        <span>{item.title}</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        ))}
                    </SidebarMenu>
                </SidebarGroup>
            </SidebarContent>
        </Sidebar>
    );
}

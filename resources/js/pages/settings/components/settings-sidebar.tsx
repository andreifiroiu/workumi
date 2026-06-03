import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { Link } from '@inertiajs/react';
import { Settings, Users, Bot, Key, Plug, CreditCard, FileText, DollarSign } from 'lucide-react';

interface SettingsNavItem {
  title: string;
  value: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
}

const settingsNavItems: SettingsNavItem[] = [
  { title: 'Workspace', value: 'workspace', icon: Settings },
  { title: 'Team & Permissions', value: 'team', icon: Users },
  { title: 'Rates', value: 'rates', href: '/account/settings/rates', icon: DollarSign },
  { title: 'AI Agents', value: 'ai-agents', icon: Bot },
  { title: 'API Keys', value: 'api-keys', icon: Key },
  { title: 'Integrations', value: 'integrations', icon: Plug },
  { title: 'Billing', value: 'billing', icon: CreditCard },
  { title: 'Audit Log', value: 'audit-log', icon: FileText },
];

export function SettingsSidebar() {
  const searchParams = new URLSearchParams(window.location.search);
  const activeTab = searchParams.get('tab') || 'workspace';
  const currentPath = window.location.pathname;

  const isItemActive = (item: SettingsNavItem): boolean => {
    // For items with custom href, check if current path matches
    if (item.href) {
      return currentPath === item.href;
    }
    // For tab-based items, check the query param
    return activeTab === item.value;
  };

  const getItemHref = (item: SettingsNavItem): string => {
    return item.href ?? `/settings?tab=${item.value}`;
  };

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
                  isActive={isItemActive(item)}
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

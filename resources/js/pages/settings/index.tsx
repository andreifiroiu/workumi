import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import type { SettingsPageProps } from '@/types/settings';
import { Head } from '@inertiajs/react';
import { AIAgentsSection } from './components/ai-agents-section';
import { ApiKeysSection } from './components/api-keys-section';
import { AuditLogSection } from './components/audit-log-section';
import { BillingSection } from './components/billing-section';
import { IntegrationsSection } from './components/integrations-section';
import {
    SettingsMobileNav,
    SettingsSidebar,
} from './components/settings-sidebar';
import { TeamSection } from './components/team-section';
import { WorkspaceSection } from './components/workspace-section';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Settings', href: '/settings' },
];

const tabTitles: Record<string, string> = {
    workspace: 'Workspace',
    team: 'Team & Permissions',
    'ai-agents': 'AI Agents',
    'api-keys': 'API Keys',
    integrations: 'Integrations',
    billing: 'Billing',
    'audit-log': 'Audit Log',
};

export default function Settings({
    workspaceSettings,
    teamMembers,
    pendingInvitations,
    teamRoles,
    isTeamOwner,
    currentUserId,
    aiAgents,
    usedTemplateIds,
    agentTemplates,
    globalAISettings,
    agentActivityLogs,
    auditLogEntries,
    integrations,
    billingInfo,
    invoices,
    aiProviders,
    agentTools,
    apiKeys,
}: SettingsPageProps) {
    const searchParams = new URLSearchParams(window.location.search);
    const activeTab = searchParams.get('tab') || 'workspace';
    const pageTitle = tabTitles[activeTab] || 'Settings';

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={pageTitle} />

            <SidebarProvider defaultOpen={true}>
                <div className="flex h-full w-full min-w-0">
                    <div className="hidden md:block">
                        <SettingsSidebar />
                    </div>

                    <SidebarInset className="min-w-0">
                        <div className="flex h-full min-w-0 flex-col gap-4 p-4">
                            <div className="flex items-center justify-between">
                                <h1 className="text-2xl font-semibold">
                                    {pageTitle}
                                </h1>
                            </div>

                            <SettingsMobileNav />

                            <div className="flex-1">
                                {activeTab === 'workspace' && (
                                    <WorkspaceSection
                                        settings={workspaceSettings}
                                    />
                                )}
                                {activeTab === 'team' && (
                                    <TeamSection
                                        members={teamMembers}
                                        pendingInvitations={pendingInvitations}
                                        teamRoles={teamRoles}
                                        isTeamOwner={isTeamOwner}
                                        currentUserId={currentUserId}
                                    />
                                )}
                                {activeTab === 'ai-agents' && (
                                    <AIAgentsSection
                                        agents={aiAgents}
                                        globalSettings={globalAISettings}
                                        activityLogs={agentActivityLogs}
                                        agentTemplates={agentTemplates}
                                        agentTools={agentTools}
                                        usedTemplateIds={usedTemplateIds}
                                        aiProviders={aiProviders}
                                    />
                                )}
                                {activeTab === 'api-keys' && (
                                    <ApiKeysSection
                                        providers={aiProviders}
                                        apiKeys={apiKeys}
                                    />
                                )}
                                {activeTab === 'integrations' && (
                                    <IntegrationsSection
                                        integrations={integrations}
                                    />
                                )}
                                {activeTab === 'billing' && (
                                    <BillingSection
                                        billingInfo={billingInfo}
                                        invoices={invoices}
                                    />
                                )}
                                {activeTab === 'audit-log' && (
                                    <AuditLogSection
                                        entries={auditLogEntries}
                                    />
                                )}
                            </div>
                        </div>
                    </SidebarInset>
                </div>
            </SidebarProvider>
        </AppLayout>
    );
}

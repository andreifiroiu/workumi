import { useState } from 'react';
import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import type { InboxPageProps, InboxTab } from '@/types/inbox';
import { InboxTabs } from '@/components/inbox/inbox-tabs';
import { InboxList } from '@/components/inbox/inbox-list';
import { ApprovalDetailPanel } from '@/components/inbox/approval-detail-panel';
import { InboxSearchBar } from '@/components/inbox/inbox-search-bar';
import { InboxBulkActions } from '@/components/inbox/inbox-bulk-actions';
import { useInboxFilters } from '@/hooks/use-inbox-filters';
import { CheckCircle, Clock, AlertTriangle } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Inbox', href: '/inbox' },
];

/**
 * Inbox page component for reviewing agent drafts, approvals, flagged items, and mentions.
 * Supports filtering by tab, search, bulk selection, and detailed item view via side panel.
 */
export default function Inbox({
    inboxItems,
    teamMembers,
    projects,
    workOrders,
}: InboxPageProps) {
    const [selectedTab, setSelectedTab] = useState<InboxTab>('all');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Filter items by tab and search
    const { filteredItems, counts } = useInboxFilters(inboxItems, selectedTab, searchQuery);

    const selectedItem = selectedItemId
        ? inboxItems.find((item) => item.id === selectedItemId) || null
        : null;

    // Calculate approval-specific stats
    const approvalItems = inboxItems.filter((item) => item.type === 'approval');
    const urgentApprovals = approvalItems.filter((item) => item.urgency === 'urgent');
    const avgWaitTime = approvalItems.length > 0
        ? Math.round(approvalItems.reduce((sum, item) => sum + item.waitingHours, 0) / approvalItems.length)
        : 0;

    // Get tab-specific description
    const getTabDescription = (tab: InboxTab): string => {
        switch (tab) {
            case 'approvals':
                return 'Review and approve pending items from AI agents and team members';
            case 'agent_drafts':
                return 'Review drafts created by AI agents before publishing';
            case 'flagged':
                return 'Items flagged for review or requiring special attention';
            case 'mentions':
                return 'Places where you have been mentioned';
            default:
                return 'Review agent drafts, approvals, flagged items, and mentions';
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Inbox" />

            <div className="flex h-full flex-1 flex-col">
                {/* Header */}
                <div className="px-6 py-6 border-b border-sidebar-border/70 dark:border-sidebar-border">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-foreground mb-2">Inbox</h1>
                            <p className="text-muted-foreground">
                                {getTabDescription(selectedTab)}
                            </p>
                        </div>

                        {/* Approval Stats Summary - visible when on approvals tab or all tab with approvals */}
                        {(selectedTab === 'approvals' || (selectedTab === 'all' && approvalItems.length > 0)) && (
                            <div className="hidden sm:flex items-center gap-4 text-sm">
                                {urgentApprovals.length > 0 && (
                                    <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
                                        <AlertTriangle className="w-4 h-4" aria-hidden="true" />
                                        <span className="font-medium">{urgentApprovals.length} urgent</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                    <CheckCircle className="w-4 h-4 text-amber-500" aria-hidden="true" />
                                    <span>{approvalItems.length} pending</span>
                                </div>
                                {avgWaitTime > 0 && (
                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                        <Clock className="w-4 h-4" aria-hidden="true" />
                                        <span>~{avgWaitTime}h avg wait</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Tabs */}
                <InboxTabs
                    currentTab={selectedTab}
                    counts={counts}
                    onTabChange={(tab) => {
                        setSelectedTab(tab);
                        // Clear selection when changing tabs
                        setSelectedIds([]);
                    }}
                />

                {/* Content */}
                <div className="flex-1 overflow-auto p-6">
                    {/* Search and Bulk Actions */}
                    <div className="mb-6 flex flex-col sm:flex-row gap-4">
                        <InboxSearchBar
                            searchQuery={searchQuery}
                            onSearchChange={setSearchQuery}
                        />

                        {selectedIds.length > 0 && (
                            <InboxBulkActions
                                selectedCount={selectedIds.length}
                                selectedIds={selectedIds}
                                onClearSelection={() => setSelectedIds([])}
                            />
                        )}
                    </div>

                    {/* List */}
                    <InboxList
                        items={filteredItems}
                        selectedIds={selectedIds}
                        onSelectItems={setSelectedIds}
                        onViewItem={setSelectedItemId}
                    />
                </div>

                {/* Side Panel */}
                <ApprovalDetailPanel
                    item={selectedItem}
                    isOpen={!!selectedItem}
                    onClose={() => setSelectedItemId(null)}
                />
            </div>
        </AppLayout>
    );
}

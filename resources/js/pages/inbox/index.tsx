import { ApprovalDetailPanel } from '@/components/inbox/approval-detail-panel';
import { InboxBulkActions } from '@/components/inbox/inbox-bulk-actions';
import { InboxList } from '@/components/inbox/inbox-list';
import { InboxSearchBar } from '@/components/inbox/inbox-search-bar';
import { InboxTabs } from '@/components/inbox/inbox-tabs';
import { useInboxFilters } from '@/hooks/use-inbox-filters';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import type { InboxPageProps, InboxTab } from '@/types/inbox';
import { Head } from '@inertiajs/react';
import { AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Inbox', href: '/inbox' }];

/**
 * Inbox page component for reviewing agent drafts, approvals, flagged items, and mentions.
 * Supports filtering by tab, search, bulk selection, and detailed item view via side panel.
 */
export default function Inbox({ inboxItems }: InboxPageProps) {
    const [selectedTab, setSelectedTab] = useState<InboxTab>('all');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Filter items by tab and search
    const { filteredItems, counts } = useInboxFilters(
        inboxItems,
        selectedTab,
        searchQuery,
    );

    const selectedItem = selectedItemId
        ? inboxItems.find((item) => item.id === selectedItemId) || null
        : null;

    // Calculate approval-specific stats
    const approvalItems = inboxItems.filter((item) => item.type === 'approval');
    const urgentApprovals = approvalItems.filter(
        (item) => item.urgency === 'urgent',
    );
    const avgWaitTime =
        approvalItems.length > 0
            ? Math.round(
                  approvalItems.reduce(
                      (sum, item) => sum + item.waitingHours,
                      0,
                  ) / approvalItems.length,
              )
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
                <div className="border-b border-sidebar-border/70 px-4 py-4 sm:px-6 sm:py-6 dark:border-sidebar-border">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h1 className="mb-2 text-2xl font-bold text-foreground">
                                Inbox
                            </h1>
                            <p className="text-muted-foreground">
                                {getTabDescription(selectedTab)}
                            </p>
                        </div>

                        {/* Approval Stats Summary - visible when on approvals tab or all tab with approvals */}
                        {(selectedTab === 'approvals' ||
                            (selectedTab === 'all' &&
                                approvalItems.length > 0)) && (
                            <div className="hidden items-center gap-4 text-sm sm:flex">
                                {urgentApprovals.length > 0 && (
                                    <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
                                        <AlertTriangle
                                            className="h-4 w-4"
                                            aria-hidden="true"
                                        />
                                        <span className="font-medium">
                                            {urgentApprovals.length} urgent
                                        </span>
                                    </div>
                                )}
                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                    <CheckCircle
                                        className="h-4 w-4 text-amber-500"
                                        aria-hidden="true"
                                    />
                                    <span>{approvalItems.length} pending</span>
                                </div>
                                {avgWaitTime > 0 && (
                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                        <Clock
                                            className="h-4 w-4"
                                            aria-hidden="true"
                                        />
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
                    <div className="mb-6 flex flex-col gap-4 sm:flex-row">
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

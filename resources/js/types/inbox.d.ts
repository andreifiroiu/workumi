// =============================================================================
// Inbox Section Types
// =============================================================================

import type { TeamMember, Project, WorkOrder } from './work';

export interface InboxItem {
    id: string;
    type: 'agent_draft' | 'approval' | 'flag' | 'mention' | 'agent_workflow_approval';
    title: string;
    contentPreview: string;
    fullContent: string;
    description?: string;
    contentFull?: string;
    timestamp: string;
    sourceId: string;
    sourceName: string;
    sourceType: 'human' | 'ai_agent';
    relatedWorkOrderId: string | null;
    relatedWorkOrderTitle: string | null;
    relatedProjectId: string | null;
    relatedProjectName: string | null;
    urgency: 'urgent' | 'high' | 'normal';
    aiConfidence: 'high' | 'medium' | 'low' | null;
    qaValidation: 'passed' | 'failed' | null;
    createdAt: string;
    waitingHours: number;
    // Additional fields for agent workflow approvals
    workflowStateId?: number;
    agentCode?: string;
    pauseReason?: string;
    // Additional fields for agent draft items (client communications)
    communicationType?: string | null;
    recipientName?: string | null;
    recipientEmail?: string | null;
    draftStatus?: 'draft' | 'approved' | 'rejected' | 'sent' | null;
    targetLanguage?: string | null;
}

// =============================================================================
// Agent Workflow Approval Types
// =============================================================================

export interface AgentWorkflowApprovalItem {
    id: number;
    workflowStateId: number;
    agentId: number;
    agentName: string;
    agentCode: string;
    actionDescription: string;
    contextPreview: string;
    pauseReason: string;
    relatedEntityType: string | null;
    relatedEntityId: number | null;
    relatedEntityName: string | null;
    createdAt: string;
    waitingHours: number;
    urgency: 'urgent' | 'high' | 'normal';
}

// =============================================================================
// View Types
// =============================================================================

export type InboxTab = 'all' | 'agent_drafts' | 'approvals' | 'flagged' | 'mentions' | 'agent_workflow';

export interface InboxCounts {
    all: number;
    agent_drafts: number;
    approvals: number;
    flagged: number;
    mentions: number;
    agent_workflow?: number;
}

// =============================================================================
// Page Props
// =============================================================================

export interface InboxPageProps {
    inboxItems: InboxItem[];
    agentWorkflowApprovals?: AgentWorkflowApprovalItem[];
    teamMembers: TeamMember[];
    projects: Project[];
    workOrders: WorkOrder[];
}

// =============================================================================
// Component Props
// =============================================================================

export interface InboxTabsProps {
    currentTab: InboxTab;
    counts: InboxCounts;
    onTabChange: (tab: InboxTab) => void;
}

export interface InboxSearchBarProps {
    searchQuery: string;
    onSearchChange: (query: string) => void;
}

export interface InboxListProps {
    items: InboxItem[];
    selectedIds: string[];
    onSelectItems: (ids: string[]) => void;
    onViewItem: (id: string) => void;
}

export interface InboxListItemProps {
    item: InboxItem;
    isSelected: boolean;
    onSelect: () => void;
    onView: () => void;
}

export interface InboxBulkActionsProps {
    selectedCount: number;
    selectedIds: string[];
    onClearSelection: () => void;
}

export interface AgentApprovalItemProps {
    item: AgentWorkflowApprovalItem;
    isSelected: boolean;
    onSelect: () => void;
    onView: () => void;
}

// =============================================================================
// Form Types
// =============================================================================

export interface RejectFeedbackForm {
    feedback: string;
}

// =============================================================================
// Action Types
// =============================================================================

export type InboxAction = 'approve' | 'defer' | 'archive' | 'reject';

export interface BulkActionPayload {
    itemIds: string[];
    action: InboxAction;
}

export interface AgentApprovalActionPayload {
    workflowStateId: number;
    action: 'approve' | 'reject';
    reason?: string;
}

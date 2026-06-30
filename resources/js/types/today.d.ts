// =============================================================================
// Today Section - Data Types
// =============================================================================

export interface TodayApproval {
    id: string;
    type: 'deliverable' | 'estimate' | 'draft';
    title: string;
    description: string;
    createdBy: string;
    createdAt: string;
    workOrderId: string;
    workOrderTitle: string;
    projectTitle: string;
    priority: 'high' | 'medium' | 'low';
    dueDate: string;
}

export interface TodayTask {
    id: string;
    title: string;
    description: string;
    status: 'todo' | 'in_progress' | 'completed';
    priority: 'high' | 'medium' | 'low';
    dueDate: string;
    isOverdue: boolean;
    isDueToday: boolean;
    assignedTo: string;
    workOrderId: string;
    workOrderTitle: string;
    projectTitle: string;
    estimatedHours: number;
}

export interface TodayBlocker {
    id: string;
    type: 'task' | 'work_order';
    title: string;
    reason:
        | 'waiting_on_external'
        | 'missing_information'
        | 'technical_issue'
        | 'waiting_on_approval';
    blockerDetails: string;
    blockedSince: string;
    workOrderId: string;
    workOrderTitle: string;
    projectTitle: string;
    priority: 'high' | 'medium' | 'low';
    assignedTo: string;
}

export interface TodayUpcomingDeadline {
    id: string;
    title: string;
    projectTitle: string;
    dueDate: string;
    daysUntilDue: number;
    status: 'draft' | 'planning' | 'in_progress' | 'review' | 'completed';
    progress: number;
    priority: 'high' | 'medium' | 'low';
    assignedTeam: string[];
}

export interface TodayActivity {
    id: string;
    type:
        | 'task_completed'
        | 'approval_created'
        | 'comment_added'
        | 'deliverable_submitted'
        | 'blocker_flagged'
        | 'task_started'
        | 'time_logged'
        | 'work_order_created';
    title: string;
    description: string;
    timestamp: string;
    user: string;
    workOrderTitle: string;
    projectTitle: string;
}

export interface TodayDailySummary {
    generatedAt: string;
    summary: string;
    priorities: string[];
    suggestedFocus: string;
}

export interface TodayMetrics {
    tasksCompletedToday: number;
    tasksCompletedThisWeek: number;
    approvalsPending: number;
    hoursLoggedToday: number;
    activeBlockers: number;
}

// =============================================================================
// Quick Capture Types
// =============================================================================

export type QuickCaptureType = 'request' | 'note' | 'task';

export interface QuickCaptureData {
    type: QuickCaptureType;
    content: string;
}

// =============================================================================
// Page Props (from Inertia)
// =============================================================================

export interface TodayPageProps {
    dailySummary: TodayDailySummary;
    approvals: TodayApproval[];
    tasks: TodayTask[];
    blockers: TodayBlocker[];
    upcomingDeadlines: TodayUpcomingDeadline[];
    activities: TodayActivity[];
    metrics: TodayMetrics;
    reviewFlows: import('./review').ReviewFlowSummary[];
}

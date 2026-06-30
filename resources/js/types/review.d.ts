export type ReviewEntityType = 'work_order' | 'task';

export type ReviewActionKind =
    | 'set_due_date'
    | 'assign'
    | 'snooze'
    | 'open'
    | 'complete';

export type ReviewActionVariant =
    | 'today'
    | 'primary'
    | 'accent'
    | 'later'
    | 'neutral'
    | 'success';

export interface ReviewAction {
    key: string;
    label: string;
    /** Lucide icon name. */
    icon: string;
    kind: ReviewActionKind;
    variant: ReviewActionVariant;
    payload: {
        preset?: 'today' | 'this_week' | 'next_week' | 'custom';
        target?: 'me' | 'pick';
        days?: number;
    };
}

export interface ReviewFlowSummary {
    key: string;
    title: string;
    description: string;
    /** Lucide icon name. */
    icon: string;
    entityType: ReviewEntityType;
    count: number;
}

export interface ReviewItem {
    id: string;
    entityType: ReviewEntityType;
    title: string;
    description: string;
    projectTitle: string;
    workOrderTitle: string | null;
    status: string;
    statusLabel: string;
    priority: string;
    dueDate: string | null;
    assignedTo: string | null;
    href: string;
}

export interface ReviewFlowDetail {
    key: string;
    title: string;
    description: string;
    icon: string;
    entityType: ReviewEntityType;
    actions: ReviewAction[];
}

export interface ReviewTeamMember {
    id: string;
    name: string;
    email: string;
}

export interface ReviewIndexProps {
    flows: ReviewFlowSummary[];
}

export interface ReviewShowProps {
    flow: ReviewFlowDetail;
    items: ReviewItem[];
    teamMembers: ReviewTeamMember[];
    currentUserId: string;
}

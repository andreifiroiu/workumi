// =============================================================================
// Work Section Types
// =============================================================================

export type BudgetType = 'fixed_price' | 'time_and_materials' | 'monthly_subscription';

export interface Party {
    id: string;
    name: string;
    type: 'client' | 'vendor' | 'department' | 'team_member';
    contactName: string | null;
    contactEmail: string | null;
}

export interface TeamMember {
    id: string;
    name: string;
    type: 'human' | 'ai_agent';
    role: string;
    avatarUrl: string | null;
    skills: string[];
}

export interface Project {
    id: string;
    name: string;
    description: string | null;
    partyId: string;
    partyName: string;
    ownerId: string;
    ownerName: string;
    status: 'active' | 'on_hold' | 'completed' | 'archived';
    startDate: string;
    targetEndDate: string | null;
    budgetHours: number | null;
    budgetType: BudgetType | null;
    budgetCost: number | null;
    actualHours: number;
    actualCost: number | null;
    actualRevenue: number | null;
    progress: number;
    tags: string[];
    isPrivate?: boolean;
    workOrderLists: WorkOrderList[];
    ungroupedWorkOrders: WorkOrderInList[];
    userRaciRoles?: RaciRole[];
    averageBillingRate?: number;
}

export interface WorkOrder {
    id: string;
    title: string;
    description: string | null;
    projectId: string;
    projectName: string;
    assignedToId: string | null;
    assignedToName: string;
    status: 'draft' | 'active' | 'in_review' | 'approved' | 'delivered' | 'archived';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    dueDate: string | null;
    estimatedHours: number;
    actualHours: number;
    budgetType: BudgetType | null;
    budgetCost: number | null;
    budgetHours: number | null;
    actualCost: number | null;
    actualRevenue: number | null;
    acceptanceCriteria: string[];
    sopAttached: boolean;
    sopName: string | null;
    partyContactId: string | null;
    createdBy: string;
    createdByName: string;
    workOrderListId?: string | null;
    workOrderListName?: string | null;
    positionInList?: number;
    userRaciRoles?: RaciRole[];
    averageBillingRate?: number;
}

export interface WorkOrderInList {
    id: string;
    title: string;
    status: 'draft' | 'active' | 'in_review' | 'approved' | 'delivered' | 'archived';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    dueDate: string | null;
    assignedToName: string;
    tasksCount: number;
    completedTasksCount: number;
    positionInList: number;
}

export interface WorkOrderList {
    id: string;
    name: string;
    description: string | null;
    color: string | null;
    position: number;
    workOrders: WorkOrderInList[];
}

export interface ChecklistItem {
    id: string;
    text: string;
    completed: boolean;
}

export interface Task {
    id: string;
    title: string;
    description: string | null;
    workOrderId: string;
    workOrderTitle: string;
    projectId: string;
    projectName: string;
    assignedToId: string | null;
    assignedToName: string;
    assignedAgentId: string | null;
    assignedAgentName: string | null;
    status: 'todo' | 'in_progress' | 'done' | 'archived';
    dueDate: string | null;
    estimatedHours: number;
    actualHours: number;
    checklistItems: ChecklistItem[];
    dependencies: string[];
    isBlocked: boolean;
}

// =============================================================================
// RACI Types
// =============================================================================

export type RaciRole = 'accountable' | 'responsible' | 'consulted' | 'informed';

export type MyWorkSubtab = 'tasks' | 'work_orders' | 'projects' | 'all';

export type DueDateRange = 'this_week' | 'next_7_days' | 'next_30_days' | 'overdue' | 'custom';

export type SortBy = 'due_date' | 'priority' | 'recently_updated' | 'alphabetical';

export type SortDirection = 'asc' | 'desc';

export interface MyWorkFiltersState {
    raciRoles: RaciRole[];
    statuses: string[];
    dueDateRange: DueDateRange | null;
    sortBy: SortBy;
    sortDirection: SortDirection;
}

export interface MyWorkMetrics {
    accountableCount: number;
    responsibleCount: number;
    awaitingReviewCount: number;
    assignedTasksCount: number;
}

export interface MyWorkData {
    projects: Array<Project & { userRaciRoles: RaciRole[] }>;
    workOrders: Array<WorkOrder & { userRaciRoles: RaciRole[] }>;
    tasks: Task[];
}

export interface MyWorkTreeProject {
    id: string;
    name: string;
    status: Project['status'];
    partyName: string;
    progress: number;
    userRaciRoles: RaciRole[];
    workOrders: MyWorkTreeWorkOrder[];
}

export interface MyWorkTreeWorkOrder {
    id: string;
    title: string;
    status: WorkOrder['status'];
    priority: WorkOrder['priority'];
    dueDate: string | null;
    userRaciRoles: RaciRole[];
    tasks: MyWorkTreeTask[];
}

export interface MyWorkTreeTask {
    id: string;
    title: string;
    status: Task['status'];
    dueDate: string | null;
    assignedToName: string;
}

export interface MyWorkTreeData {
    projects: MyWorkTreeProject[];
}

// =============================================================================
// Deliverable Version Types
// =============================================================================

export interface DeliverableVersion {
    id: string;
    versionNumber: number;
    fileUrl: string;
    fileName: string;
    fileSize: string;
    mimeType: string;
    notes: string | null;
    uploadedBy: { id: string; name: string } | null;
    createdAt: string;
}

export interface Deliverable {
    id: string;
    title: string;
    description: string | null;
    workOrderId: string;
    workOrderTitle: string;
    projectId: string;
    type: 'document' | 'design' | 'report' | 'code' | 'other';
    status: 'draft' | 'in_review' | 'approved' | 'delivered';
    version: string;
    createdDate: string;
    deliveredDate: string | null;
    fileUrl: string | null;
    acceptanceCriteria: string[];
    versionCount: number;
    latestVersion: DeliverableVersion | null;
}

export interface CommunicationThread {
    id: string;
    workItemType: 'project' | 'workOrder' | 'task';
    workItemId: string;
    workItemTitle: string;
    messageCount: number;
    lastActivity: string | null;
}

export interface Message {
    id: string;
    threadId?: string;
    authorId: string;
    authorName: string;
    authorType: 'human' | 'ai_agent';
    timestamp: string;
    content: string;
    type: 'note' | 'suggestion' | 'decision' | 'question';
}

export interface Document {
    id: string;
    name: string;
    type: 'reference' | 'artifact' | 'evidence' | 'template';
    fileUrl: string;
    mimeType?: string;
    folderId?: string | null;
    attachedToType?: 'project' | 'workOrder' | 'task' | 'deliverable';
    attachedToId?: string;
    uploadedBy?: string;
    uploadedDate?: string;
    fileSize: string | null;
}

export interface TimeEntry {
    id: number;
    task_id: number;
    user_id: number;
    hours: number;
    date: string;
    mode: 'manual' | 'timer' | 'ai_estimation';
    note: string | null;
    is_billable: boolean;
    started_at: string | null;
    stopped_at: string | null;
    task?: {
        id: number;
        title: string;
        work_order?: {
            id: number;
            title: string;
            project?: {
                id: number;
                name: string;
            };
        };
    };
}

// =============================================================================
// Pagination Types
// =============================================================================

export interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

export interface PaginatedData<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
    links: PaginationLink[];
    first_page_url: string;
    last_page_url: string;
    next_page_url: string | null;
    prev_page_url: string | null;
    path: string;
}

export interface TimeEntriesFilters {
    date_from: string | null;
    date_to: string | null;
    task_id: string | null;
    billable: string | null;
}

// =============================================================================
// View Types
// =============================================================================

export type WorkView = 'all_projects' | 'my_work' | 'by_status' | 'calendar' | 'archive';

export interface QuickAddData {
    type: 'project' | 'workOrder' | 'task';
    title: string;
    parentId?: string;
}

// =============================================================================
// Page Props
// =============================================================================

export interface WorkPageProps {
    projects: Project[];
    workOrders: WorkOrder[];
    tasks: Task[];
    deliverables: Deliverable[];
    parties: Party[];
    teamMembers: TeamMember[];
    communicationThreads: CommunicationThread[];
    currentView: WorkView;
    currentUserId: string;
    myWorkData?: MyWorkData;
    myWorkMetrics?: MyWorkMetrics;
    myWorkSubtab?: MyWorkSubtab;
    myWorkShowInformed?: boolean;
}

export interface TimeEntriesPageProps {
    entries: PaginatedData<TimeEntry>;
    filters: TimeEntriesFilters;
}

export interface ProjectDetailProps {
    project: Project & { canTogglePrivacy?: boolean };
    workOrders: Array<{
        id: string;
        title: string;
        status: string;
        priority: string;
        dueDate: string | null;
        assignedToName: string;
        tasksCount: number;
        completedTasksCount: number;
        workOrderListId: string | null;
        positionInList: number;
    }>;
    workOrderLists: WorkOrderList[];
    ungroupedWorkOrders: WorkOrderInList[];
    documents: Document[];
    communicationThread: {
        id: string;
        messageCount: number;
        lastActivity: string | null;
    } | null;
    messages: Message[];
    parties: Array<{ id: string; name: string }>;
    teamMembers: ProjectTeamMember[];
}

export interface WorkOrderDetailProps {
    workOrder: WorkOrder;
    tasks: Array<{
        id: string;
        title: string;
        status: string;
        dueDate: string;
        assignedToName: string;
        estimatedHours: number;
        actualHours: number;
        checklistItems: ChecklistItem[];
        isBlocked: boolean;
    }>;
    deliverables: Array<{
        id: string;
        title: string;
        description: string | null;
        type: string;
        status: string;
        version: string;
        createdDate: string;
        deliveredDate: string | null;
        fileUrl: string | null;
        acceptanceCriteria: string[];
    }>;
    documents: Document[];
    communicationThread: {
        id: string;
        messageCount: number;
    } | null;
    messages: Message[];
    teamMembers: Array<{ id: string; name: string }>;
}

export interface TaskDetailProps {
    task: Task;
    timeEntries: TimeEntry[];
    activeTimer: {
        id: string;
        startedAt: string;
    } | null;
    teamMembers: Array<{ id: string; name: string }>;
}

export interface DeliverableDetailProps {
    deliverable: Deliverable & {
        projectName: string;
    };
    documents: Array<{
        id: string;
        name: string;
        type: string;
        fileUrl: string;
        fileSize: string;
        uploadedAt: string;
    }>;
    versions: DeliverableVersion[];
}

// =============================================================================
// Component Props
// =============================================================================

export interface ViewTabsProps {
    currentView: WorkView;
    onViewChange: (view: WorkView) => void;
}

export interface QuickAddBarProps {
    onQuickAdd: (data: QuickAddData) => void;
    parentType?: 'project' | 'workOrder';
    parentId?: string;
}

export interface ProjectTreeItemProps {
    project: Project;
    workOrders: WorkOrder[];
    tasks: Task[];
    onViewProject: (projectId: string) => void;
    onCreateWorkOrder: (projectId: string) => void;
    onViewWorkOrder: (workOrderId: string) => void;
    onCreateTask: (workOrderId: string) => void;
    onViewTask: (taskId: string) => void;
}

export interface MyWorkViewProps {
    workOrders: WorkOrder[];
    tasks: Task[];
    currentUserId: string;
    onViewWorkOrder: (workOrderId: string) => void;
    onViewTask: (taskId: string) => void;
    onUpdateWorkOrderStatus: (workOrderId: string, status: WorkOrder['status']) => void;
    onUpdateTaskStatus: (taskId: string, status: Task['status']) => void;
}

export interface KanbanViewProps {
    workOrders: WorkOrder[];
    onViewWorkOrder: (workOrderId: string) => void;
    onCreateWorkOrder: (data: QuickAddData) => void;
    onUpdateWorkOrderStatus: (workOrderId: string, status: WorkOrder['status']) => void;
}

export interface CalendarViewProps {
    projects: Project[];
    workOrders: WorkOrder[];
    onViewProject: (projectId: string) => void;
    onViewWorkOrder: (workOrderId: string) => void;
}

export interface ArchiveViewProps {
    projects: Project[];
    workOrders: WorkOrder[];
    tasks: Task[];
    onViewProject: (projectId: string) => void;
    onRestoreProject: (projectId: string) => void;
}

export interface CommunicationPanelProps {
    threadId: string | null;
    messages: Message[];
    onAddMessage: (content: string, type: Message['type']) => void;
    isLoading?: boolean;
}

export interface TimeTrackerProps {
    taskId: string;
    activeTimer: { id: string; startedAt: string } | null;
    onStartTimer: () => void;
    onStopTimer: () => void;
    onLogManual: (hours: number, date: string, note?: string) => void;
}

// =============================================================================
// Project Team Member Types
// =============================================================================

export interface TeamMemberRole {
    role: 'owner' | 'accountable' | 'responsible' | 'assigned' | 'reviewer' | 'consulted' | 'informed';
    scope: 'project' | 'work_order' | 'task';
    scopeTitle: string;
}

export interface ProjectTeamMember {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
    roles: TeamMemberRole[];
    workload: {
        workOrdersCount: number;
        tasksCount: number;
        totalEstimatedHours: number;
    };
}

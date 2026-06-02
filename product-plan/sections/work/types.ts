// =============================================================================
// Data Types
// =============================================================================

export interface Party {
  id: string
  name: string
  type: 'client' | 'vendor' | 'department' | 'team_member'
  contactName: string | null
  contactEmail: string | null
}

export interface TeamMember {
  id: string
  name: string
  type: 'human' | 'ai_agent'
  role: string
  avatarUrl: string | null
  skills: string[]
}

export interface Project {
  id: string
  name: string
  description: string
  partyId: string
  partyName: string
  ownerId: string
  ownerName: string
  status: 'active' | 'on_hold' | 'completed' | 'archived'
  startDate: string
  targetEndDate: string | null
  budgetHours: number | null
  actualHours: number
  progress: number
  tags: string[]
}

export interface WorkOrder {
  id: string
  title: string
  description: string
  projectId: string
  projectName: string
  assignedToId: string | null
  assignedToName: string
  status: 'draft' | 'active' | 'in_review' | 'approved' | 'delivered'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  dueDate: string
  estimatedHours: number
  actualHours: number
  acceptanceCriteria: string[]
  sopAttached: boolean
  sopName: string | null
  partyContactId: string | null
  createdBy: string
  createdByName: string
}

export interface ChecklistItem {
  id: string
  text: string
  completed: boolean
}

export interface Task {
  id: string
  title: string
  description: string
  workOrderId: string
  workOrderTitle: string
  projectId: string
  assignedToId: string | null
  assignedToName: string
  status: 'todo' | 'in_progress' | 'done'
  dueDate: string
  estimatedHours: number
  actualHours: number
  checklistItems: ChecklistItem[]
  dependencies: string[]
  isBlocked: boolean
}

export interface Deliverable {
  id: string
  title: string
  description: string
  workOrderId: string
  workOrderTitle: string
  projectId: string
  type: 'document' | 'design' | 'report' | 'code' | 'other'
  status: 'draft' | 'in_review' | 'approved' | 'delivered'
  version: string
  createdDate: string
  deliveredDate: string | null
  fileUrl: string
  acceptanceCriteria: string[]
}

export interface CommunicationThread {
  id: string
  workItemType: 'project' | 'workOrder' | 'task'
  workItemId: string
  workItemTitle: string
  messageCount: number
  lastActivity: string
}

export interface Message {
  id: string
  threadId: string
  authorId: string
  authorName: string
  authorType: 'human' | 'ai_agent'
  timestamp: string
  content: string
  type: 'note' | 'suggestion' | 'decision' | 'question'
}

export interface Document {
  id: string
  name: string
  type: 'reference' | 'artifact' | 'evidence' | 'template'
  fileUrl: string
  attachedToType: 'project' | 'workOrder' | 'task' | 'deliverable'
  attachedToId: string
  uploadedBy: string
  uploadedDate: string
  fileSize: string
}

// =============================================================================
// View Types
// =============================================================================

export type WorkView = 'all_projects' | 'my_work' | 'by_status' | 'calendar' | 'archive'

export type TimeTrackingMode = 'manual' | 'timer' | 'ai_estimation'

export interface TimeEntry {
  taskId: string
  hours: number
  date: string
  mode: TimeTrackingMode
  note?: string
}

export interface QuickAddData {
  type: 'project' | 'workOrder' | 'task'
  title: string
  parentId?: string
}

// =============================================================================
// Component Props
// =============================================================================

export interface WorkProps {
  /** All projects data */
  projects: Project[]

  /** All work orders data */
  workOrders: WorkOrder[]

  /** All tasks data */
  tasks: Task[]

  /** All deliverables data */
  deliverables: Deliverable[]

  /** Parties (clients, vendors, departments) */
  parties: Party[]

  /** Team members (humans and AI agents) */
  teamMembers: TeamMember[]

  /** Communication threads */
  communicationThreads: CommunicationThread[]

  /** Messages within threads */
  messages: Message[]

  /** Documents attached to work items */
  documents: Document[]

  /** Current active view */
  currentView?: WorkView

  /** Currently logged in user ID */
  currentUserId?: string

  /** Called when user switches to a different view */
  onViewChange?: (view: WorkView) => void

  /** Called when user wants to view project details */
  onViewProject?: (projectId: string) => void

  /** Called when user wants to create a new project */
  onCreateProject?: (data: QuickAddData) => void

  /** Called when user wants to edit a project */
  onEditProject?: (projectId: string) => void

  /** Called when user wants to delete a project */
  onDeleteProject?: (projectId: string) => void

  /** Called when user wants to archive a project */
  onArchiveProject?: (projectId: string) => void

  /** Called when user wants to view work order details */
  onViewWorkOrder?: (workOrderId: string) => void

  /** Called when user wants to create a new work order */
  onCreateWorkOrder?: (data: QuickAddData) => void

  /** Called when user wants to edit a work order */
  onEditWorkOrder?: (workOrderId: string) => void

  /** Called when user wants to delete a work order */
  onDeleteWorkOrder?: (workOrderId: string) => void

  /** Called when user wants to change work order status */
  onUpdateWorkOrderStatus?: (workOrderId: string, status: WorkOrder['status']) => void

  /** Called when user wants to view task details */
  onViewTask?: (taskId: string) => void

  /** Called when user wants to create a new task */
  onCreateTask?: (data: QuickAddData) => void

  /** Called when user wants to edit a task */
  onEditTask?: (taskId: string) => void

  /** Called when user wants to delete a task */
  onDeleteTask?: (taskId: string) => void

  /** Called when user wants to change task status */
  onUpdateTaskStatus?: (taskId: string, status: Task['status']) => void

  /** Called when user toggles a checklist item */
  onToggleChecklistItem?: (taskId: string, itemId: string, completed: boolean) => void

  /** Called when user wants to view deliverable details */
  onViewDeliverable?: (deliverableId: string) => void

  /** Called when user wants to create a new deliverable */
  onCreateDeliverable?: (workOrderId: string) => void

  /** Called when user wants to delete a deliverable */
  onDeleteDeliverable?: (deliverableId: string) => void

  /** Called when user logs time manually */
  onLogTime?: (entry: TimeEntry) => void

  /** Called when user starts a timer for a task */
  onStartTimer?: (taskId: string) => void

  /** Called when user stops a timer */
  onStopTimer?: (taskId: string) => void

  /** Called when user accepts AI time estimation */
  onAcceptTimeEstimation?: (taskId: string, hours: number) => void

  /** Called when user wants to view comms thread */
  onViewCommsThread?: (threadId: string) => void

  /** Called when user adds a message to a thread */
  onAddMessage?: (threadId: string, content: string, type: Message['type']) => void

  /** Called when user uploads a document */
  onUploadDocument?: (document: Partial<Document>) => void

  /** Called when user downloads a document */
  onDownloadDocument?: (documentId: string) => void

  /** Called when user attaches an SOP to a work order */
  onAttachSOP?: (workOrderId: string, sopId: string) => void

  /** Called when user expands/collapses a tree item */
  onToggleExpand?: (itemType: 'project' | 'workOrder', itemId: string, expanded: boolean) => void

  /** Called when user performs a search */
  onSearch?: (query: string) => void

  /** Called when user applies filters */
  onFilter?: (filters: Record<string, unknown>) => void
}

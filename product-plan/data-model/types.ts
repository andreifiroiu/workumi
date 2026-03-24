/**
 * Workumi Data Model - TypeScript Type Definitions
 *
 * This file contains all TypeScript interfaces and types for the Workumi platform.
 * These types align with the entities defined in the data model and provide
 * type safety for all components and data interactions.
 */

// =============================================================================
// Core Entity Types
// =============================================================================

// --- Party ---

export type PartyType = 'client' | 'vendor' | 'partner' | 'internal-department'
export type PartyStatus = 'active' | 'inactive'

export interface Party {
  id: string
  name: string
  type: PartyType
  status: PartyStatus
  primaryContactId: string
  primaryContactName: string
  email: string
  phone: string
  website: string
  address: string
  notes: string
  tags: string[]
  linkedContactIds: string[]
  linkedProjectIds: string[]
  createdAt: string
  lastActivity: string
}

// --- Contact ---

export type EngagementType = 'requester' | 'approver' | 'stakeholder' | 'billing'
export type ContactStatus = 'active' | 'inactive'
export type CommunicationPreference = 'email' | 'phone' | 'slack'

export interface Contact {
  id: string
  name: string
  email: string
  phone: string
  partyId: string
  partyName: string
  title: string
  role: string
  engagementType: EngagementType
  communicationPreference: CommunicationPreference
  timezone: string
  notes: string
  status: ContactStatus
  tags: string[]
  createdAt: string
}

// --- Project ---

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

// --- Work Order ---

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

// --- Task ---

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
  status: 'todo' | 'in_progress' | 'done' | 'completed'
  priority: 'high' | 'medium' | 'low'
  dueDate: string
  isOverdue?: boolean
  estimatedHours: number
  actualHours: number
  checklistItems: ChecklistItem[]
  dependencies: string[]
  isBlocked: boolean
}

// --- Deliverable ---

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

// --- Team Member ---

export type TeamMemberStatus = 'active' | 'inactive'

export interface Skill {
  name: string
  proficiency: 1 | 2 | 3 // 1 = Basic, 2 = Intermediate, 3 = Advanced
}

export interface TeamMember {
  id: string
  name: string
  email: string
  type: 'human' | 'ai_agent'
  role: string
  avatar: string
  avatarUrl: string | null
  status: TeamMemberStatus
  skills: Skill[] | string[]
  capacityHoursPerWeek: number
  currentWorkloadHours?: number
  timezone: string
  joinedAt: string
  assignedProjectIds: string[]
  tags: string[]
  permissions?: string[]
  lastActiveAt?: string
}

// --- Communication Thread & Messages ---

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

// --- Document ---

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

// --- Approval ---

export interface Approval {
  id: string
  type: 'deliverable' | 'estimate' | 'draft'
  title: string
  description: string
  createdBy: string
  createdAt: string
  workOrderId: string
  workOrderTitle: string
  projectTitle: string
  priority: 'high' | 'medium' | 'low'
  dueDate: string
}

// --- Blocker ---

export interface Blocker {
  id: string
  type: 'task' | 'work_order'
  title: string
  reason: 'waiting_on_external' | 'missing_information' | 'technical_issue' | 'waiting_on_approval'
  blockerDetails: string
  blockedSince: string
  workOrderId: string
  workOrderTitle: string
  projectTitle: string
  priority: 'high' | 'medium' | 'low'
  assignedTo: string
}

// =============================================================================
// Today Section Types
// =============================================================================

export interface UpcomingDeadline {
  id: string
  title: string
  projectTitle: string
  dueDate: string
  daysUntilDue: number
  status: 'draft' | 'planning' | 'in_progress' | 'review' | 'completed'
  progress: number
  priority: 'high' | 'medium' | 'low'
  assignedTeam: string[]
}

export interface Activity {
  id: string
  type: 'task_completed' | 'approval_created' | 'comment_added' | 'deliverable_submitted' | 'blocker_flagged' | 'task_started' | 'time_logged' | 'work_order_created'
  title: string
  description: string
  timestamp: string
  user: string
  workOrderTitle: string
  projectTitle: string
}

export interface DailySummary {
  generatedAt: string
  summary: string
  priorities: string[]
  suggestedFocus: string
}

export interface Metrics {
  tasksCompletedToday: number
  tasksCompletedThisWeek: number
  approvalsPending: number
  hoursLoggedToday: number
  activeBlockers: number
}

export type QuickCaptureType = 'request' | 'note' | 'task'

export interface QuickCaptureData {
  type: QuickCaptureType
  content: string
}

// =============================================================================
// Inbox Section Types
// =============================================================================

export interface InboxItem {
  id: string
  type: 'agent_draft' | 'approval' | 'flag' | 'mention'
  title: string
  contentPreview: string
  fullContent: string
  sourceId: string
  sourceName: string
  sourceType: 'human' | 'ai_agent'
  relatedWorkOrderId: string | null
  relatedWorkOrderTitle: string | null
  relatedProjectId: string | null
  relatedProjectName: string | null
  urgency: 'urgent' | 'high' | 'normal'
  aiConfidence: 'high' | 'medium' | 'low' | null
  qaValidation: 'passed' | 'failed' | null
  createdAt: string
  waitingHours: number
}

export type InboxTab = 'all' | 'agent_drafts' | 'approvals' | 'flagged' | 'mentions'

export interface InboxFilters {
  tab: InboxTab
  search?: string
  urgency?: InboxItem['urgency']
  sourceType?: 'human' | 'ai_agent'
  sortBy?: 'date' | 'urgency' | 'waiting'
}

export interface BulkActionData {
  itemIds: string[]
  action: 'approve' | 'defer' | 'archive'
}

export interface ActionFeedback {
  itemId: string
  feedback: string
}

// =============================================================================
// Playbooks Section Types
// =============================================================================

// SOP Types
export interface SOPStep {
  id: string
  order: number
  title: string
  description: string
  evidenceRequired: 'document' | 'link' | 'screenshot' | 'approval' | 'calendar-invite'
  evidenceDescription: string
  assignedRole: string
}

export interface SOP {
  id: string
  type: 'sop'
  name: string
  description: string
  triggerConditions: string
  steps: SOPStep[]
  rolesInvolved: string[]
  estimatedTimeMinutes: number
  definitionOfDone: string
  tags: string[]
  timesApplied: number
  lastUsed: string
  createdBy: string
  createdByName: string
  lastModified: string
  aiGenerated: boolean
  usedByWorkOrders: string[]
  versionHistory?: VersionHistoryEntry[]
}

// Checklist Types
export interface PlaybookChecklistItem {
  id: string
  label: string
  completed: boolean
  assignedRole?: string
  evidenceRequired?: boolean
  evidenceDescription?: string
}

export interface Checklist {
  id: string
  type: 'checklist'
  name: string
  description: string
  items: PlaybookChecklistItem[]
  tags: string[]
  timesApplied: number
  lastUsed: string
  createdBy: string
  createdByName: string
  lastModified: string
  aiGenerated: boolean
  usedByWorkOrders: string[]
  versionHistory?: VersionHistoryEntry[]
}

// Template Types
export type TemplateType = 'project' | 'work-order' | 'document'

export interface ProjectTemplateStructure {
  milestones: Array<{
    name: string
    durationDays: number
    workOrders: string[]
  }>
  defaultTeamRoles: string[]
  estimatedTotalDays: number
}

export interface WorkOrderTemplateStructure {
  prefilledScope: string
  attachedSOPs: string[]
  attachedChecklists: string[]
  attachedAcceptanceCriteria: string[]
  estimatedHours: number
  defaultTasks: string[]
}

export interface DocumentTemplateStructure {
  sections: Array<{
    heading: string
    description: string
  }>
  outputFormat: string
}

export interface Template {
  id: string
  type: 'template'
  templateType: TemplateType
  name: string
  description: string
  structure: ProjectTemplateStructure | WorkOrderTemplateStructure | DocumentTemplateStructure
  tags: string[]
  timesApplied: number
  lastUsed: string
  createdBy: string
  createdByName: string
  lastModified: string
  aiGenerated: boolean
  usedByWorkOrders: string[]
  versionHistory?: VersionHistoryEntry[]
}

// Acceptance Criteria Types
export interface CriteriaRule {
  id: string
  rule: string
  validationType: 'automated' | 'manual'
  validationTool: string | null
}

export interface AcceptanceCriteria {
  id: string
  type: 'acceptance_criteria'
  name: string
  description: string
  criteria: CriteriaRule[]
  tags: string[]
  timesApplied: number
  lastUsed: string
  createdBy: string
  createdByName: string
  lastModified: string
  aiGenerated: boolean
  usedByWorkOrders: string[]
  versionHistory?: VersionHistoryEntry[]
}

export interface VersionHistoryEntry {
  version: number
  modifiedBy: string
  modifiedAt: string
  changeDescription: string
}

export type Playbook = SOP | Checklist | Template | AcceptanceCriteria
export type PlaybookType = 'sop' | 'checklist' | 'template' | 'acceptance_criteria'
export type PlaybookTab = 'all' | PlaybookType

export interface PlaybookFilters {
  tab: PlaybookTab
  search?: string
  tags?: string[]
  sortBy?: 'recent' | 'popular' | 'alphabetical'
}

// =============================================================================
// Reports Section Types
// =============================================================================

export type ProjectHealthStatus = 'on-track' | 'at-risk' | 'overdue'
export type ProjectTrend = 'improving' | 'stable' | 'declining'
export type WorkloadStatus = 'available' | 'optimal' | 'near-capacity' | 'overloaded'
export type TaskAgingSeverity = 'normal' | 'warning' | 'critical'
export type BlockerImpact = 'low' | 'medium' | 'high' | 'critical'
export type BudgetStatus = 'under-budget' | 'on-track' | 'over-budget'
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'auto_approved' | 'failed'
export type SLAStatus = 'on-time' | 'breached'
export type AgentStatus = 'active' | 'paused' | 'inactive' | 'enabled' | 'disabled'
export type InsightType = 'anomaly' | 'recommendation' | 'positive'
export type InsightSeverity = 'info' | 'warning' | 'critical'
export type InsightCategory =
  | 'budget'
  | 'workload'
  | 'capacity'
  | 'blocker'
  | 'approval'
  | 'performance'
export type ReportViewMode = 'by-project' | 'by-person' | 'by-time-period'
export type TimeRange = 'last-7-days' | 'last-30-days' | 'this-month' | 'custom'

export interface ProjectStatusReport {
  id: string
  projectId: string
  projectName: string
  partyName: string
  status: ProjectHealthStatus
  healthScore: number
  completionPercentage: number
  dueDate: string
  daysUntilDue?: number
  daysOverdue?: number
  workOrdersTotal: number
  workOrdersCompleted: number
  workOrdersInProgress: number
  workOrdersBlocked?: number
  tasksTotal: number
  tasksCompleted: number
  deliverablesTotal: number
  deliverablesApproved: number
  budgetAllocated: number
  budgetSpent: number
  hoursEstimated: number
  hoursLogged: number
  trend: ProjectTrend
  lastUpdated: string
  risks?: string[]
}

export interface WorkloadReport {
  id: string
  teamMemberId: string
  teamMemberName: string
  role: string
  capacityHoursPerWeek: number
  assignedHoursPerWeek: number
  utilizationPercentage: number
  status: WorkloadStatus
  assignedProjects: number
  assignedWorkOrders: number
  assignedTasks: number
  projectNames: string[]
  nextAvailableDate: string
  trend: 'increasing' | 'stable' | 'decreasing'
}

export interface TaskAgingReport {
  id: string
  taskId: string
  taskName: string
  projectName: string
  workOrderName: string
  status: string
  assignedTo: string
  daysInCurrentStatus: number
  createdDate: string
  lastUpdated: string
  estimatedHours: number
  blockedReason?: string
  severity: TaskAgingSeverity
}

export interface BlockerReport {
  id: string
  itemType: 'task' | 'work-order' | 'project'
  itemId: string
  itemName: string
  projectName: string
  blockedReason: string
  blockedBy: string
  assignedTo: string
  blockedDate: string
  daysBlocked: number
  impact: BlockerImpact
  actionRequired: string
}

export interface TimeBudgetReport {
  id: string
  projectId: string
  projectName: string
  partyName: string
  budgetAllocated: number
  budgetSpent: number
  budgetRemaining: number
  budgetUtilization: number
  hoursEstimated: number
  hoursLogged: number
  hoursRemaining: number
  hourlyBurnRate: number
  projectedOverrun: number
  status: BudgetStatus
  weeklySpend: number[]
  lastUpdated: string
}

export interface ApprovalsVelocityReport {
  id: string
  approvalId: string
  itemType: 'deliverable' | 'agent-output'
  itemName: string
  projectName: string
  submittedBy: string
  submittedDate: string
  approver: string
  approvedDate?: string
  status: ApprovalStatus
  daysInReview: number
  priority: 'normal' | 'high' | 'critical'
  sla: number
  slaStatus: SLAStatus
  notes?: string
}

export interface AgentActivityReport {
  id: string
  agentId: string
  agentName: string
  agentType: string
  runsTotal: number
  runsThisWeek: number
  outputsGenerated: number
  outputsApproved: number
  outputsRejected: number
  outputsPending: number
  approvalRate: number
  averageApprovalTime: number
  totalCost: number
  costThisWeek: number
  tasksCompleted: number
  taskCompletionRate: number
  lastRun: string
  status: AgentStatus
}

export interface AIInsight {
  id: string
  type: InsightType
  severity: InsightSeverity
  category: InsightCategory
  title: string
  description: string
  affectedEntity: string | null
  affectedEntityName?: string
  detectedDate: string
  recommendation: string
  actionRequired: boolean
  dismissed: boolean
}

export interface ReportFilters {
  viewMode: ReportViewMode
  timeRange: TimeRange
  customStartDate?: string
  customEndDate?: string
  projectId?: string
  teamMemberId?: string
}

// =============================================================================
// Settings Section Types
// =============================================================================

export type UserRole = 'admin' | 'manager' | 'member' | 'viewer'
export type UserStatus = 'active' | 'inactive'
export type AgentType =
  | 'project-management'
  | 'work-routing'
  | 'content-creation'
  | 'quality-assurance'
  | 'data-analysis'
export type IntegrationType =
  | 'email'
  | 'calendar'
  | 'communication'
  | 'accounting'
  | 'payments'
  | 'automation'
export type IntegrationStatus = 'connected' | 'disconnected'
export type BillingCycle = 'monthly' | 'annual'
export type BillingStatus = 'active' | 'past_due' | 'canceled'
export type InvoiceStatus = 'paid' | 'pending' | 'overdue'
export type AuditActorType = 'user' | 'agent' | 'system'
export type AuditAction =
  | 'updated_workspace_settings'
  | 'invited_user'
  | 'updated_user_role'
  | 'deactivated_user'
  | 'enabled_agent'
  | 'disabled_agent'
  | 'updated_agent_config'
  | 'updated_global_ai_budget'
  | 'approved_agent_output'
  | 'rejected_agent_output'
  | 'generated_content'
  | 'generated_report'
  | 'assigned_task'
  | 'connected_integration'
  | 'disconnected_integration'
  | 'paid_invoice'
  | 'updated_notification_preferences'
export type VerbosityLevel = 'concise' | 'balanced' | 'detailed'
export type CreativityLevel = 'low' | 'balanced' | 'high'
export type RiskTolerance = 'low' | 'medium' | 'high'

export interface WorkspaceSettings {
  name: string
  timezone: string
  workWeekStart: string
  defaultProjectStatus: string
  brandColor: string
  logo: string
  workingHoursStart: string
  workingHoursEnd: string
  dateFormat: string
  currency: string
  createdAt: string
  updatedAt: string
}

export interface AIAgent {
  id: string
  name: string
  type: AgentType
  description: string
  status: AgentStatus
  capabilities: string[]
  createdAt: string
}

export interface AgentConfiguration {
  agentId: string
  enabled: boolean
  dailyRunLimit: number
  weeklyRunLimit: number
  monthlyBudgetCap: number
  currentMonthSpend: number
  permissions: {
    canCreateWorkOrders: boolean
    canModifyTasks: boolean
    canAccessClientData: boolean
    canSendEmails: boolean
    requiresApproval: boolean
  }
  behaviorSettings: {
    verbosityLevel: VerbosityLevel
    creativityLevel: CreativityLevel
    riskTolerance: RiskTolerance
  }
}

export interface GlobalAISettings {
  totalMonthlyBudget: number
  currentMonthSpend: number
  perProjectBudgetCap: number
  approvalRequirements: {
    clientFacingContent: boolean
    financialData: boolean
    contractualChanges: boolean
    workOrderCreation: boolean
    taskAssignment: boolean
  }
}

export interface AgentActivityLog {
  id: string
  agentId: string
  agentName: string
  runType: string
  timestamp: string
  input: string
  output: string | null
  tokensUsed: number
  cost: number
  approvalStatus: ApprovalStatus
  approvedBy: string | null
  approvedAt: string | null
  error: string | null
}

export interface Integration {
  id: string
  name: string
  type: IntegrationType
  description: string
  status: IntegrationStatus
  icon: string
  connectedAt: string | null
  connectedBy: string | null
  lastSyncAt: string | null
  settings: Record<string, any> | null
}

export interface BillingInfo {
  plan: string
  status: BillingStatus
  billingCycle: BillingCycle
  price: number
  nextBillingDate: string
  currentPeriodStart: string
  currentPeriodEnd: string
  usage: {
    teamMembers: {
      included: number
      current: number
      overage: number
      overageCost: number
    }
    aiAgents: {
      included: number
      current: number
      overage: number
      overageCost: number
    }
    storage: {
      included: number
      current: number
      unit: string
      overage: number
      overageCost: number
    }
    aiTokens: {
      included: number
      current: number
      overage: number
      overageCost: number
    }
  }
  paymentMethod: {
    type: string
    last4: string
    brand: string
    expiryMonth: number
    expiryYear: number
  }
}

export interface Invoice {
  id: string
  invoiceNumber: string
  date: string
  dueDate: string
  amount: number
  status: InvoiceStatus
  paidAt: string | null
  downloadUrl: string
}

export interface NotificationPreferencesDetailed {
  email: Record<string, boolean>
  push: Record<string, boolean>
  slack: Record<string, boolean>
}

export interface AuditLogEntry {
  id: string
  timestamp: string
  actor: string
  actorName: string
  actorType: AuditActorType
  action: AuditAction
  target: string
  targetId: string
  details: string
  ipAddress: string
}

export type SettingsSection =
  | 'workspace'
  | 'team'
  | 'ai-agents'
  | 'integrations'
  | 'billing'
  | 'notifications'
  | 'audit-log'

export interface SettingsFilters {
  auditLogSearch?: string
  auditLogDateFrom?: string
  auditLogDateTo?: string
  auditLogActionType?: AuditAction
  auditLogActorType?: AuditActorType
}

// =============================================================================
// User Menu Types
// =============================================================================

export interface User {
  id: string
  displayName: string
  email: string
  avatarUrl?: string
  phone?: string
  timezone: string
  language: string
}

export interface Organization {
  id: string
  name: string
  slug: string
  avatarUrl?: string
  plan: 'Free' | 'Starter' | 'Pro'
  role: 'Owner' | 'Admin' | 'Member'
  memberCount: number
  lastActive: string
  isCurrent: boolean
}

export interface NotificationChannel {
  email: boolean
  push: boolean
  inApp: boolean
}

export interface QuietHours {
  enabled: boolean
  startTime: string
  endTime: string
  timezone: string
}

export interface NotificationPreferences {
  assignedToMe: NotificationChannel
  mentioned: NotificationChannel
  approvalRequested: NotificationChannel
  taskDueSoon: NotificationChannel
  projectUpdates: NotificationChannel
  agentCompletedWork: NotificationChannel
  weeklyDigest: NotificationChannel
  quietHours: QuietHours
}

export interface AppearanceSettings {
  theme: 'light' | 'dark' | 'system'
  density: 'comfortable' | 'compact'
  sidebarDefault: 'expanded' | 'collapsed'
  startPage: 'today' | 'work' | 'inbox'
}

export interface Session {
  id: string
  device: string
  browser: string
  location: string
  ipAddress: string
  lastActive: string
  isCurrent: boolean
}

export interface ConnectedApp {
  id: string
  name: string
  provider: string
  connectedAt: string
  permissions: string[]
  avatarUrl?: string
}

export interface ApiKey {
  id: string
  name: string
  keyPreview: string
  createdAt: string
  lastUsed: string | null
  expiresAt: string | null
}

export interface PlanLimits {
  members: number
  projects: number
  aiTasksPerMonth: number
  storage: string
}

export interface Plan {
  id: string
  name: string
  price: number
  billingPeriod: 'month' | 'year'
  features: string[]
  limits: PlanLimits
  isPopular?: boolean
}

export interface TeamInvite {
  email: string
  role: 'Admin' | 'Member'
}

export interface CreateOrganizationData {
  name: string
  planId: string
  teamInvites?: TeamInvite[]
}

// =============================================================================
// Work Section View Types
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

export type DirectoryTab = 'parties' | 'contacts' | 'team'

export interface DirectoryFilters {
  tab: DirectoryTab
  search?: string
  type?: PartyType | EngagementType
  status?: PartyStatus | ContactStatus | TeamMemberStatus
  tags?: string[]
}

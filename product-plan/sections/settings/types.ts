// =============================================================================
// Data Types
// =============================================================================

export type UserRole = 'admin' | 'manager' | 'member' | 'viewer'
export type UserStatus = 'active' | 'inactive'
export type AgentType =
  | 'project-management'
  | 'work-routing'
  | 'content-creation'
  | 'quality-assurance'
  | 'data-analysis'
export type AgentStatus = 'enabled' | 'disabled'
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
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'auto_approved' | 'failed'
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

export interface TeamMember {
  id: string
  name: string
  email: string
  role: UserRole
  status: UserStatus
  avatar: string
  permissions: string[]
  joinedAt: string
  lastActiveAt: string
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
  settings: Record<string, unknown> | null
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

export interface NotificationPreferences {
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

// =============================================================================
// View Types
// =============================================================================

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
// Component Props
// =============================================================================

export interface SettingsProps {
  /** Workspace configuration settings */
  workspaceSettings: WorkspaceSettings

  /** Team members with roles and permissions */
  teamMembers: TeamMember[]

  /** AI agents available in the workspace */
  aiAgents: AIAgent[]

  /** Configuration for each AI agent */
  agentConfigurations: AgentConfiguration[]

  /** Global AI budget and approval settings */
  globalAISettings: GlobalAISettings

  /** Historical logs of AI agent activity */
  agentActivityLogs: AgentActivityLog[]

  /** Third-party integrations */
  integrations: Integration[]

  /** Billing information and usage */
  billingInfo: BillingInfo

  /** Past invoices */
  invoices: Invoice[]

  /** Notification preferences */
  notificationPreferences: NotificationPreferences

  /** Audit log entries */
  auditLogEntries: AuditLogEntry[]

  /** Currently active settings section */
  activeSection?: SettingsSection

  /** Current filters for audit log */
  filters?: SettingsFilters

  /** Called when user switches to a different settings section */
  onSectionChange?: (section: SettingsSection) => void

  /** Called when user updates workspace settings */
  onUpdateWorkspaceSettings?: (settings: Partial<WorkspaceSettings>) => void

  /** Called when user invites a new team member */
  onInviteTeamMember?: (email: string, role: UserRole) => void

  /** Called when user updates a team member's role */
  onUpdateTeamMemberRole?: (userId: string, role: UserRole) => void

  /** Called when user removes a team member */
  onRemoveTeamMember?: (userId: string) => void

  /** Called when user views a team member's details */
  onViewTeamMember?: (userId: string) => void

  /** Called when user enables or disables an AI agent */
  onToggleAgent?: (agentId: string, enabled: boolean) => void

  /** Called when user updates an agent's configuration */
  onUpdateAgentConfig?: (agentId: string, config: Partial<AgentConfiguration>) => void

  /** Called when user updates global AI settings */
  onUpdateGlobalAISettings?: (settings: Partial<GlobalAISettings>) => void

  /** Called when user views detailed agent activity log */
  onViewAgentActivity?: (logId: string) => void

  /** Called when user approves pending agent output */
  onApproveAgentOutput?: (logId: string) => void

  /** Called when user rejects pending agent output */
  onRejectAgentOutput?: (logId: string) => void

  /** Called when user connects an integration */
  onConnectIntegration?: (integrationId: string) => void

  /** Called when user disconnects an integration */
  onDisconnectIntegration?: (integrationId: string) => void

  /** Called when user configures integration settings */
  onConfigureIntegration?: (integrationId: string, settings: Record<string, unknown>) => void

  /** Called when user downloads an invoice */
  onDownloadInvoice?: (invoiceId: string) => void

  /** Called when user updates payment method */
  onUpdatePaymentMethod?: () => void

  /** Called when user changes billing plan */
  onChangePlan?: () => void

  /** Called when user updates notification preferences */
  onUpdateNotificationPreferences?: (
    channel: 'email' | 'push' | 'slack',
    category: string,
    enabled: boolean
  ) => void

  /** Called when user filters audit log */
  onFilterAuditLog?: (filters: SettingsFilters) => void

  /** Called when user exports audit log */
  onExportAuditLog?: () => void

  /** Called when user views audit log entry details */
  onViewAuditLogEntry?: (entryId: string) => void
}

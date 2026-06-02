// =============================================================================
// Data Types
// =============================================================================

// SOP-specific types
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

// Checklist-specific types
export interface ChecklistItem {
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
  items: ChecklistItem[]
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

// Template-specific types
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

// Acceptance Criteria-specific types
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

// Version history
export interface VersionHistoryEntry {
  version: number
  modifiedBy: string
  modifiedAt: string
  changeDescription: string
}

// Union type for all playbook types
export type Playbook = SOP | Checklist | Template | AcceptanceCriteria

export interface WorkOrder {
  id: string
  title: string
  projectName: string
}

// =============================================================================
// View Types
// =============================================================================

export type PlaybookType = 'sop' | 'checklist' | 'template' | 'acceptance_criteria'

export type PlaybookTab = 'all' | PlaybookType

export interface PlaybookFilters {
  tab: PlaybookTab
  search?: string
  tags?: string[]
  sortBy?: 'recent' | 'popular' | 'alphabetical'
}

// =============================================================================
// Component Props
// =============================================================================

export interface PlaybooksProps {
  /** All playbooks */
  playbooks: Playbook[]

  /** Work orders for context/reference */
  workOrders: WorkOrder[]

  /** Currently active tab */
  currentTab?: PlaybookTab

  /** Called when user switches tabs */
  onTabChange?: (tab: PlaybookTab) => void

  /** Called when user clicks a playbook to view details */
  onViewPlaybook?: (id: string) => void

  /** Called when user wants to create a new playbook */
  onCreatePlaybook?: (type: PlaybookType) => void

  /** Called when user wants to edit a playbook */
  onEditPlaybook?: (id: string) => void

  /** Called when user wants to delete a playbook */
  onDeletePlaybook?: (id: string) => void

  /** Called when user wants to duplicate a playbook */
  onDuplicatePlaybook?: (id: string) => void

  /** Called when user wants to apply playbook to work items */
  onApplyPlaybook?: (playbookId: string, workOrderIds: string[]) => void

  /** Called when user requests AI to generate a template */
  onGenerateTemplate?: (type: PlaybookType, prompt: string) => void

  /** Called when user saves playbook changes */
  onSavePlaybook?: (id: string, data: unknown) => void

  /** Called when user applies filters or search */
  onFilter?: (filters: PlaybookFilters) => void

  /** Called when user performs a search */
  onSearch?: (query: string) => void

  /** Called when user views usage history */
  onViewUsageHistory?: (id: string) => void

  /** Called when user views version history */
  onViewVersionHistory?: (id: string) => void
}

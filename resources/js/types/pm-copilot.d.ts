// =============================================================================
// PM Copilot Types
// =============================================================================

/**
 * Confidence level for AI-generated suggestions
 */
export type AIConfidence = 'high' | 'medium' | 'low';

/**
 * Insight types for project analysis
 */
export type InsightType = 'overdue' | 'bottleneck' | 'resource' | 'scope_creep';

/**
 * Insight severity levels
 */
export type InsightSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Workflow status for PM Copilot
 */
export type WorkflowStatus = 'idle' | 'running' | 'paused' | 'completed' | 'failed';

/**
 * PM Copilot mode setting
 */
export type PMCopilotMode = 'staged' | 'full';

// =============================================================================
// Suggestion Types
// =============================================================================

/**
 * Deliverable suggestion from PM Copilot
 */
export interface DeliverableSuggestion {
    id: string;
    title: string;
    description: string;
    type: 'document' | 'design' | 'report' | 'code' | 'other';
    acceptanceCriteria: string[];
    confidence: AIConfidence;
}

/**
 * Task suggestion from PM Copilot
 */
export interface TaskSuggestion {
    id: string;
    title: string;
    description: string;
    estimatedHours: number;
    positionInWorkOrder: number;
    checklistItems: string[];
    dependencies: string[];
    confidence: AIConfidence;
}

/**
 * Plan alternative containing deliverables and tasks
 */
export interface PlanAlternative {
    id: string;
    name: string;
    description: string;
    confidence: AIConfidence;
    deliverables: DeliverableSuggestion[];
    tasks: TaskSuggestion[];
}

// =============================================================================
// Project Insight Types
// =============================================================================

/**
 * Affected item reference in an insight
 */
export interface AffectedItem {
    id: string;
    type: 'project' | 'workOrder' | 'task' | 'deliverable';
    title: string;
    url?: string;
}

/**
 * Project insight from PM Copilot analysis
 */
export interface ProjectInsight {
    id: string;
    type: InsightType;
    severity: InsightSeverity;
    title: string;
    description: string;
    suggestion: string;
    affectedItems?: AffectedItem[];
    confidence: AIConfidence;
}

// =============================================================================
// Workflow State Types
// =============================================================================

/**
 * PM Copilot workflow state
 */
export interface PMCopilotWorkflowState {
    status: WorkflowStatus;
    currentStep: string | null;
    progress: number;
    error: string | null;
}

/**
 * PM Copilot suggestions response
 */
export interface PMCopilotSuggestionsResponse {
    workOrderId: string;
    workflowState: PMCopilotWorkflowState;
    alternatives: PlanAlternative[];
    approvedAlternativeId?: string | null;
    rejectedAlternativeIds?: string[];
    insights: ProjectInsight[];
    createdAt: string;
    updatedAt: string;
}

// =============================================================================
// Component Props Types
// =============================================================================

/**
 * Props for PMCopilotTriggerButton component
 */
export interface PMCopilotTriggerButtonProps {
    workOrderId: string;
    onTrigger: () => void;
    isRunning?: boolean;
    disabled?: boolean;
    feedbackMessage?: string | null;
    feedbackError?: string | null;
    hasExistingPlan?: boolean;
}

/**
 * Props for PlanAlternativesPanel component
 */
export interface PlanAlternativesPanelProps {
    alternatives: PlanAlternative[];
    onApprove: (alternativeId: string) => void;
    onReject: (alternativeId: string, reason?: string) => void;
    selectedAlternativeId?: string | null;
    rejectedAlternativeIds?: string[];
    isLoading?: boolean;
}

/**
 * Props for DeliverableSuggestionCard component
 */
export interface DeliverableSuggestionCardProps {
    suggestion: DeliverableSuggestion;
    onApprove: (suggestionId: string) => void;
    onReject: (suggestionId: string, reason?: string) => void;
    isApproved?: boolean;
    isRejected?: boolean;
    disabled?: boolean;
}

/**
 * Props for TaskSuggestionCard component
 */
export interface TaskSuggestionCardProps {
    tasks: TaskSuggestion[];
    onApprove?: (taskId: string) => void;
    onReject?: (taskId: string, reason?: string) => void;
    showActions?: boolean;
}

/**
 * Props for ProjectInsightsPanel component
 */
export interface ProjectInsightsPanelProps {
    insights: ProjectInsight[];
    onInsightClick?: (insightId: string) => void;
    isLoading?: boolean;
}

/**
 * Props for InsightCard component
 */
export interface InsightCardProps {
    insight: ProjectInsight;
    onClick?: () => void;
}

/**
 * Props for PMCopilotSettingsToggle component
 */
export interface PMCopilotSettingsToggleProps {
    workOrderId: string;
    currentMode: PMCopilotMode;
    onChange?: (newMode: PMCopilotMode) => void;
    disabled?: boolean;
}

// =============================================================================
// Task Delegation Types
// =============================================================================

/**
 * AI-suggested task assignment
 */
export interface TaskAssignmentSuggestion {
    taskId: string;
    assigneeType: 'user' | 'agent';
    assigneeId: string;
    assigneeName: string;
    reasoning: string;
}

/**
 * Available assignee option (team member or AI agent)
 */
export interface AssigneeOption {
    id: string;
    name: string;
    type: 'user' | 'agent';
    agentType?: string;
}

/**
 * A single bulk assignment entry
 */
export interface BulkAssignment {
    taskId: string;
    assigneeType: 'user' | 'agent';
    assigneeId: string;
}

/**
 * Props for PlanExecutionPanel component
 */
export interface PlanExecutionPanelProps {
    workOrderId: string;
    tasks: Array<{
        id: string;
        title: string;
        estimatedHours: number;
        assignedToId: string | null;
        assignedToName: string;
        assignedAgentId: string | null;
        assignedAgentName: string | null;
        status: string;
    }>;
    teamMembers: Array<{ id: string; name: string }>;
    availableAgents: Array<{ id: string; name: string; type: string }>;
    onConfirmAssignments: (assignments: BulkAssignment[]) => void;
    onDelegateAll: () => void;
    isDelegating: boolean;
    isConfirming: boolean;
    aiSuggestions: TaskAssignmentSuggestion[];
    delegationError?: string | null;
}

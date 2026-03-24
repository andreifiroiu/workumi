# Task Breakdown: AI Agent Foundation and Tool Gateway

## Overview
Total Tasks: 65 (across 8 task groups)

This is an XL-sized feature establishing foundational infrastructure for AI agents. The scope includes agent abstraction layer, tool gateway, permission system, context builder, orchestration engine, audit logging, and agent template system.

**Note:** Specific agent implementations (Dispatcher, PM Copilot, QA, etc.) are OUT OF SCOPE - this covers only the foundation infrastructure.

## Task List

---

### Database Layer

#### Task Group 1: Data Models and Migrations
**Dependencies:** None
**Specialist:** Backend Engineer (Database)

- [x] 1.0 Complete database layer for AI Agent Foundation
  - [x] 1.1 Write 6-8 focused tests for new models and relationships
    - Test AgentTemplate creation and validation
    - Test AIAgent relationship to AgentTemplate (belongs_to, nullable)
    - Test AgentMemory scoping (project, client, org levels)
    - Test AgentWorkflowState pause/resume state persistence
    - Test AgentActivityLog extended fields (tool_calls, context_accessed)
    - Test AgentConfiguration new permission fields
  - [x] 1.2 Create AgentTemplate model and migration
    - Fields: `code` (unique), `name`, `type` (AgentType enum), `description`, `default_instructions` (text), `default_tools` (JSON), `default_permissions` (JSON), `is_active` (boolean, default true)
    - Add timestamps
    - Index on `code` for lookups
  - [x] 1.3 Extend AIAgent model with template relationship
    - Add `template_id` nullable foreign key to `agent_templates`
    - Add `is_custom` boolean field (default false)
    - Add `hasMany` relationship to AgentWorkflowState
    - Add `belongsTo` relationship to AgentTemplate
  - [x] 1.4 Create AgentMemory model and migration
    - Fields: `team_id`, `ai_agent_id` (nullable), `scope` (enum: project, client, org), `scope_id` (polymorphic), `key`, `value` (JSON), `expires_at` (nullable datetime)
    - Indexes: composite on (team_id, scope, scope_id, key)
    - Soft deletes for audit trail
  - [x] 1.5 Create AgentWorkflowState model and migration
    - Fields: `team_id`, `ai_agent_id`, `workflow_class`, `current_node`, `state_data` (JSON), `paused_at` (nullable), `resumed_at` (nullable), `completed_at` (nullable), `pause_reason`, `approval_required` (boolean)
    - Add `approvable_type` and `approvable_id` for morph relationship to InboxItem
    - Indexes: on team_id, ai_agent_id, status lookup
  - [x] 1.6 Extend AgentConfiguration with new fields
    - Add permission fields: `can_modify_deliverables`, `can_access_financial_data`, `can_modify_playbooks` (all boolean, default false)
    - Add `daily_spend` decimal field for daily cap tracking
    - Add `tool_permissions` JSON field for future granular overrides
    - Cast new boolean fields appropriately
  - [x] 1.7 Extend AgentActivityLog with audit fields
    - Add `tool_calls` JSON field for detailed tool execution records
    - Add `context_accessed` JSON field for memory/context audit trail
    - Add `workflow_state_id` nullable foreign key to agent_workflow_states
    - Add `duration_ms` integer for execution timing
  - [x] 1.8 Extend GlobalAISettings with retention configuration
    - Add `retention_days` integer field (default 90)
    - Add `require_approval_external_sends` boolean (default true)
    - Add `require_approval_financial` boolean (default true)
    - Add `require_approval_contracts` boolean (default true)
    - Add `require_approval_scope_changes` boolean (default true)
  - [x] 1.9 Ensure database layer tests pass
    - Run ONLY the 6-8 tests written in 1.1
    - Verify all migrations run successfully
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- The 6-8 tests written in 1.1 pass
- All new models created with proper relationships
- Migrations run without errors
- Existing AIAgent, AgentConfiguration, AgentActivityLog models extended without breaking changes

---

### Backend Services - Core Infrastructure

#### Task Group 2: Tool Gateway and Tool System
**Dependencies:** Task Group 1
**Specialist:** Backend Engineer (Services)

- [x] 2.0 Complete Tool Gateway architecture
  - [x] 2.1 Write 6-8 focused tests for Tool Gateway
    - Test tool registration via service container
    - Test permission check at gateway level (allowed scenario)
    - Test permission denial at gateway level (blocked scenario)
    - Test tool execution logging to AgentActivityLog
    - Test ToolInterface contract enforcement
    - Test JSON tool configuration loading
  - [x] 2.2 Create ToolInterface contract
    - Methods: `name(): string`, `description(): string`, `category(): string`, `execute(array $params): array`, `getParameters(): array`
    - Place in `app/Contracts/Tools/ToolInterface.php`
  - [x] 2.3 Create ToolGateway service
    - Single entry point for all agent tool execution
    - Method: `execute(AIAgent $agent, AgentConfiguration $config, string $toolName, array $params): ToolResult`
    - Enforce permission checks before delegating to tool
    - Log all execution attempts to AgentActivityLog (success, denied, failed)
    - Return structured ToolResult with status, data, and error info
  - [x] 2.4 Create ToolRegistry service
    - Register tools via Laravel service container
    - Load tool definitions from JSON files in `config/agent-tools/`
    - Method: `register(ToolInterface $tool)`, `get(string $name): ?ToolInterface`, `all(): Collection`
    - Auto-discover tools tagged in service provider
  - [x] 2.5 Create JSON tool configuration structure
    - Create `config/agent-tools/` directory
    - Create sample tool definition schema: `{ name, description, category, parameters, required_permissions }`
    - Create `config/agent-tools/schema.json` for validation
  - [x] 2.6 Create ToolResult value object
    - Properties: `success`, `data`, `error`, `executionTimeMs`
    - Immutable class with named constructors: `success()`, `failure()`, `denied()`
  - [x] 2.7 Register ToolGateway in AgentServiceProvider
    - Create `app/Providers/AgentServiceProvider.php`
    - Register as singleton: ToolGateway, ToolRegistry
    - Add to `bootstrap/providers.php`
  - [x] 2.8 Ensure Tool Gateway tests pass
    - Run ONLY the 6-8 tests written in 2.1
    - Verify tool registration and execution flow
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- The 6-8 tests written in 2.1 pass
- ToolGateway enforces permissions before execution
- All tool calls logged with success/denied/failed status
- Tools do NOT self-check permissions (gateway handles all authorization)

---

#### Task Group 3: Permission System and Budget Management
**Dependencies:** Task Group 1, Task Group 2
**Specialist:** Backend Engineer (Services)

- [x] 3.0 Complete Permission and Budget System
  - [x] 3.1 Write 6-8 focused tests for permission and budget services
    - Test category-based permission check (can_create_work_orders, etc.)
    - Test new permission categories (can_modify_deliverables, can_access_financial_data, can_modify_playbooks)
    - Test system-level approval requirements (external sends, financial, contracts, scope changes)
    - Test daily budget validation (under cap)
    - Test daily budget rejection (over cap)
    - Test monthly budget validation
    - Test budget decrement on activity logging
  - [x] 3.2 Create AgentPermissionService
    - Method: `canExecuteTool(AgentConfiguration $config, ToolInterface $tool): bool`
    - Method: `requiresHumanApproval(string $actionType): bool`
    - Check against category-based permissions from AgentConfiguration
    - Check GlobalAISettings for system-level approval overrides
    - Map tool categories to permission fields
  - [x] 3.3 Create AgentBudgetService
    - Method: `canRun(AgentConfiguration $config, float $estimatedCost): bool`
    - Method: `deductCost(AgentConfiguration $config, float $cost): void`
    - Method: `getDailyRemaining(AgentConfiguration $config): float`
    - Method: `getMonthlyRemaining(AgentConfiguration $config): float`
    - Check both daily_spend and current_month_spend against caps
  - [x] 3.4 Create ResetDailySpendCommand
    - Artisan command: `agents:reset-daily-spend`
    - Reset `daily_spend` to 0 for all AgentConfiguration records
    - Schedule in `routes/console.php` to run at midnight
  - [x] 3.5 Create permission category mapping configuration
    - Create `config/agent-permissions.php`
    - Map tool categories to required permissions
    - Define system-level approval requirements
  - [x] 3.6 Integrate permission and budget checks into ToolGateway
    - Call AgentPermissionService before tool execution
    - Call AgentBudgetService before initiating agent runs
    - Return appropriate denial responses with reasons
  - [x] 3.7 Ensure permission and budget tests pass
    - Run ONLY the 6-8 tests written in 3.1
    - Verify permission enforcement works correctly
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- The 6-8 tests written in 3.1 pass
- Category-based permissions enforced correctly
- System-level approvals enforced for high-risk actions
- Daily and monthly budget caps respected

---

#### Task Group 4: Agent Abstraction Layer and Context Builder
**Dependencies:** Task Group 1, Task Group 2, Task Group 3
**Specialist:** Backend Engineer (Services)

- [x] 4.0 Complete Agent Abstraction Layer and Context Builder
  - [x] 4.1 Write 6-8 focused tests for BaseAgent and ContextBuilder
    - Test BaseAgent extends neuron-ai Agent class
    - Test provider() returns configured AI provider from GlobalAISettings
    - Test instructions() loads from agent configuration
    - Test tools() returns filtered tools from ToolGateway
    - Test ContextBuilder assembles project-level context
    - Test ContextBuilder respects token limits with truncation
    - Test AgentMemory storage and retrieval
  - [x] 4.2 Create BaseAgent class extending neuron-ai Agent
    - Extend `NeuronAI\Agent` with Workumi-specific behaviors
    - Implement `provider()` to return AI provider based on GlobalAISettings
    - Implement `instructions()` to load system prompt from AgentConfiguration or AIAgent
    - Implement `tools()` to return tools filtered through ToolGateway permissions
    - Add budget checking before each run
    - Support multi-turn conversation via neuron-ai's built-in message history
  - [x] 4.3 Create ContextBuilder service
    - Method: `build(Model $entity, AIAgent $agent): AgentContext`
    - Method: `buildProjectContext(Project $project): array`
    - Method: `buildClientContext(Party $party): array`
    - Method: `buildOrgContext(Team $team): array`
    - Load context based on entity being operated on (task, work order, project, party)
    - Implement token limit enforcement (configurable max tokens)
    - Prioritize recent and relevant context when truncation needed
  - [x] 4.4 Create AgentContext value object
    - Properties: `projectContext`, `clientContext`, `orgContext`, `metadata`
    - Method: `toPromptString(): string` for LLM consumption
    - Method: `getTokenEstimate(): int`
  - [x] 4.5 Create AgentMemoryService
    - Method: `store(Team $team, string $scope, int $scopeId, string $key, mixed $value, ?int $ttlMinutes): void`
    - Method: `retrieve(Team $team, string $scope, int $scopeId, string $key): mixed`
    - Method: `forget(Team $team, string $scope, int $scopeId, string $key): void`
    - Method: `getForScope(Team $team, string $scope, int $scopeId): Collection`
    - Handle expiration via `expires_at` field
  - [x] 4.6 Create AgentRunner service
    - Method: `run(AIAgent $agent, AgentConfiguration $config, array $input, ?Model $contextEntity): AgentActivityLog`
    - Orchestrate: budget check -> context build -> agent execution -> logging
    - Create AgentActivityLog entry with full audit trail
    - Handle errors gracefully with proper logging
  - [x] 4.7 Ensure agent abstraction tests pass
    - Run ONLY the 6-8 tests written in 4.1
    - Verify BaseAgent integrates with neuron-ai correctly
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- The 6-8 tests written in 4.1 pass
- BaseAgent extends neuron-ai Agent with Workumi behaviors
- ContextBuilder assembles 3-level memory (project, client, org)
- Token limits respected with intelligent truncation

---

#### Task Group 5: Orchestration Engine
**Dependencies:** Task Group 1, Task Group 4
**Specialist:** Backend Engineer (Services)

- [x] 5.0 Complete Orchestration Engine
  - [x] 5.1 Write 6-8 focused tests for orchestration engine
    - Test AgentOrchestrator coordinates multi-agent workflow
    - Test workflow pause creates AgentWorkflowState record
    - Test workflow resume from paused state
    - Test InboxItem creation for agent approval requests
    - Test workflow customization loading from database
    - Test integration with Human Checkpoint pattern
  - [x] 5.2 Create AgentOrchestrator service
    - Method: `execute(string $workflowClass, array $input, Team $team): AgentWorkflowState`
    - Method: `pause(AgentWorkflowState $state, string $reason): void`
    - Method: `resume(AgentWorkflowState $state, array $approvalData): void`
    - Coordinate multi-agent workflows using neuron-ai's native Workflow system
    - Store state in database for durability
  - [x] 5.3 Create WorkflowCustomization model and migration
    - Fields: `team_id`, `workflow_class`, `customizations` (JSON), `enabled` (boolean)
    - JSON schema: `{ disabled_steps: [], parameters: {}, hooks: {} }`
    - Unique constraint on (team_id, workflow_class)
  - [x] 5.4 Create AgentApprovalService
    - Method: `requestApproval(AgentWorkflowState $state, string $actionDescription): InboxItem`
    - Method: `handleApproval(InboxItem $item, User $approver): void`
    - Method: `handleRejection(InboxItem $item, User $rejector, string $reason): void`
    - Create InboxItems for agent actions requiring human approval
    - Follow InboxItem creation pattern from WorkflowTransitionService
    - Resume workflows after approval using stored state
  - [x] 5.5 Integrate with existing Human Checkpoint Workflow
    - Use `InboxItemType::Approval` for agent approval requests
    - Set `approvable_type` to AgentWorkflowState
    - Follow `markAsApproved`/`markAsRejected` pattern
    - Respect AI_RESTRICTED_TRANSITIONS pattern for checkpoint enforcement
  - [x] 5.6 Create base workflow templates for neuron-ai
    - Create `app/Agents/Workflows/` directory structure
    - Create abstract `BaseAgentWorkflow` extending neuron-ai Workflow
    - Include hooks for customization loading from database
    - Include pause/resume integration points
  - [x] 5.7 Ensure orchestration engine tests pass
    - Run ONLY the 6-8 tests written in 5.1
    - Verify pause/resume capability works correctly
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- The 6-8 tests written in 5.1 pass
- Workflows can pause awaiting human approval
- Workflows resume correctly after approval
- InboxItems created for agent approval requests

---

### API Layer

#### Task Group 6: API Endpoints
**Dependencies:** Task Groups 1-5
**Specialist:** API Engineer

- [x] 6.0 Complete API layer for Agent Foundation
  - [x] 6.1 Write 6-8 focused tests for API endpoints
    - Test GET /settings/agent-templates returns template list
    - Test POST /settings/agents creates agent from template
    - Test PATCH /settings/agents/{id}/configuration updates permissions
    - Test GET /settings/agents/{id}/activity returns activity logs with tool_calls
    - Test POST /settings/agents/{id}/run executes agent (budget check)
    - Test POST /settings/workflow-states/{id}/approve resumes workflow
    - Test POST /settings/workflow-states/{id}/reject updates workflow with rejection reason
    - Test POST /settings/agents/{id}/run returns error when budget exceeded
  - [x] 6.2 Create AgentTemplateController
    - `index()`: List available agent templates
    - `show($id)`: Get template details
    - Return template with default_tools, default_permissions
  - [x] 6.3 Extend AIAgentController
    - `store()`: Create agent from template or custom
    - `update()`: Update agent configuration
    - `updateConfiguration()`: Update permissions, budget caps, tool permissions
    - `run()`: Execute agent with input (uses AgentRunner)
  - [x] 6.4 Create AgentActivityController
    - `index($agentId)`: List activity logs with pagination
    - `show($activityId)`: Get detailed activity with tool_calls, context_accessed
    - Support filtering by date range, approval_status
    - Include related workflow_state data
  - [x] 6.5 Create AgentWorkflowController
    - `show($stateId)`: Get workflow state details
    - `approve($stateId)`: Approve paused workflow (uses AgentOrchestrator)
    - `reject($stateId)`: Reject paused workflow with reason
  - [x] 6.6 Create API Resources for consistent responses
    - `AgentTemplateResource`
    - `AgentActivityResource` (include tool_calls expansion)
    - `AgentWorkflowStateResource`
    - Follow existing resource patterns in codebase
  - [x] 6.7 Add routes to routes/settings.php (Inertia routes)
    - Agent template routes under settings
    - Agent activity routes
    - Workflow approval routes
    - Apply appropriate middleware (auth)
  - [x] 6.8 Ensure API layer tests pass
    - Run ONLY the 6-8 tests written in 6.1
    - Verify CRUD operations work correctly
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- The 8 tests written in 6.1 pass
- All CRUD operations work for agent templates
- Activity logs expose tool_calls and context_accessed
- Workflow approval/rejection endpoints functional

---

### Frontend Layer

#### Task Group 7: UI Extensions
**Dependencies:** Task Group 6
**Specialist:** UI Designer / Frontend Engineer

- [x] 7.0 Complete UI extensions for Agent Foundation
  - [x] 7.1 Write 4-6 focused tests for critical UI components
    - Test AgentPermissionsPanel renders permission checkboxes
    - Test AgentToolsPanel renders tool category toggles
    - Test ActivityDetailModal displays tool calls
    - Test BudgetDisplay shows daily and monthly breakdown
  - [x] 7.2 Extend Agent Config tab with permissions panel
    - Add "Permissions" section below existing Daily Run Limit / Monthly Budget Cap
    - Display checkboxes for: can_create_work_orders, can_modify_tasks, can_access_client_data, can_send_emails, can_modify_deliverables, can_access_financial_data, can_modify_playbooks
    - Add collapsible "Advanced Settings" section for verbosity, creativity, risk_tolerance
    - Match existing dark theme with emerald accents (per visual `Screenshot 2026-01-19 at 21.38.15.png`)
  - [x] 7.3 Add Tools tab to agent expanded view
    - Create new "Tools" tab alongside Config, Activity, Budget
    - Display tool categories with enable/disable toggles
    - Show tool descriptions and required permissions
    - Gray out tools that require unavailable permissions
  - [x] 7.4 Extend Activity tab with tool call details
    - Add expandable detail view for each activity entry
    - Show tool calls made (name, params, result, duration)
    - Add filter by approval status and date range
    - Match existing activity row pattern (per visual `Screenshot 2026-01-19 at 21.38.24.png`)
  - [x] 7.5 Extend Budget tab with daily display
    - Add Daily Budget section alongside Monthly Budget
    - Show: Daily Cap, Daily Spent, Daily Remaining with progress bar
    - Add cost breakdown by tool category (simple list or bar chart)
    - Match existing budget display pattern (per visual `Screenshot 2026-01-19 at 21.38.31.png`)
  - [x] 7.6 Create AgentTemplateSelector component
    - Modal or page for selecting agent template when creating new agent
    - Display template cards with name, description, default capabilities
    - Option to create fully custom agent
  - [x] 7.7 Add agent approval items to Inbox
    - Display agent workflow approval requests in existing Inbox
    - Show action description, requesting agent, context preview
    - Approve/Reject buttons with confirmation
    - Link to workflow state details
  - [x] 7.8 Ensure UI component tests pass
    - Run ONLY the 4-6 tests written in 7.1
    - Verify components render correctly
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- The 4-6 tests written in 7.1 pass
- Permissions panel displays all permission categories
- Tools tab shows available tools with toggles
- Activity detail shows tool calls
- Budget tab shows daily and monthly breakdown

---

### Seeding and Integration

#### Task Group 8: Agent Template Seeding and Final Integration
**Dependencies:** Task Groups 1-7
**Specialist:** Backend Engineer

- [x] 8.0 Complete seeding and integration
  - [x] 8.1 Write 4-6 focused tests for seeding and integration
    - Test AgentTemplateSeeder creates expected templates
    - Test agent creation from template inherits defaults
    - Test end-to-end: create agent -> run -> log activity with tool calls
    - Test daily spend reset command execution
  - [x] 8.2 Create AgentTemplateSeeder
    - Seed template library:
      - Dispatcher: triage, routing, work orders, task breakdown
      - PM Copilot: planning, milestones, dependencies, nudges
      - QA/Compliance: validates against criteria, SOP, brand rules
      - Finance: drafts estimates/invoices, flags margin issues
      - Client Comms: drafts communications, never auto-sends
      - Domain Skills: Copy, Ops, Analyst, Tech, Design
    - Include default_tools, default_permissions, default_instructions for each
    - Mark templates as `is_active = true`
  - [x] 8.3 Create sample tool implementations
    - Create 2-3 sample tools implementing ToolInterface for testing:
      - `TaskListTool`: List tasks for a project/work order
      - `WorkOrderInfoTool`: Get work order details
      - `CreateNoteTool`: Create a note on an entity
    - Register in ToolRegistry via AgentServiceProvider
    - Place in `app/Agents/Tools/` directory
  - [x] 8.4 Create tool configuration files
    - Create JSON definitions in `config/agent-tools/`:
      - `task-list.json`
      - `work-order-info.json`
      - `create-note.json`
    - Include required_permissions, parameters, descriptions
  - [x] 8.5 Update DatabaseSeeder to include agent templates
    - Call AgentTemplateSeeder in dev/demo environments
    - Ensure existing AI agent seeds remain compatible
  - [x] 8.6 Ensure seeding and integration tests pass
    - Run ONLY the 4-6 tests written in 8.1
    - Verify templates seeded correctly
    - Verify sample tools work end-to-end
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- The 4-6 tests written in 8.1 pass
- 6+ agent templates seeded with sensible defaults
- Sample tools demonstrate full pipeline
- Integration between all components verified

---

### Testing

#### Task Group 9: Test Review and Gap Analysis
**Dependencies:** Task Groups 1-8
**Specialist:** QA Engineer

- [x] 9.0 Review existing tests and fill critical gaps only
  - [x] 9.1 Review tests from Task Groups 1-8
    - Review database tests from Task 1.1 (8 tests)
    - Review Tool Gateway tests from Task 2.1 (8 tests)
    - Review Permission/Budget tests from Task 3.1 (8 tests)
    - Review Agent Abstraction tests from Task 4.1 (8 tests)
    - Review Orchestration tests from Task 5.1 (7 tests)
    - Review API tests from Task 6.1 (8 tests)
    - Review UI tests from Task 7.1 (10 tests)
    - Review Integration tests from Task 8.1 (6 tests)
    - Total existing tests: 63 backend + 10 frontend = 73 tests
  - [x] 9.2 Analyze test coverage gaps for THIS feature only
    - Identified critical user workflows lacking test coverage:
      - End-to-end permission denial -> InboxItem approval -> workflow resume
      - Budget boundary conditions (daily available but monthly exceeded, and vice versa)
      - Failed tool execution logging
      - Unknown tool execution handling
      - Disabled agent configuration blocking execution
      - Context Builder token truncation with substantial real data
      - GlobalAISettings system-level approval override verification
  - [x] 9.3 Write up to 10 additional strategic tests maximum
    - Created `tests/Feature/Agents/AgentIntegrationTest.php` with 9 strategic tests:
      - Complete flow: tool permission denied creates inbox item, approval resumes workflow
      - Agent creation from template via API inherits all permissions correctly
      - Budget check fails when daily available but monthly exceeded
      - Budget check fails when monthly available but daily exceeded
      - Failed tool execution is logged with error details
      - Executing unknown tool returns appropriate error
      - Disabled agent configuration blocks execution via API
      - Context builder truncates appropriately with large project data
      - System-level approval requirement forces workflow pause for financial actions
  - [x] 9.4 Run feature-specific tests only
    - Ran all tests in `tests/Feature/Agents/` directory
    - Total: 62 backend tests passed (320 assertions)
    - Ran frontend tests: 10 tests passed
    - All critical workflows verified as passing

**Acceptance Criteria:**
- All feature-specific tests pass (72 tests total: 62 backend + 10 frontend)
- Critical user workflows for AI Agent Foundation are covered
- 9 additional tests added (within the 10 maximum)
- Testing focused exclusively on this spec's feature requirements

---

## Execution Order

Recommended implementation sequence:

```
Phase 1: Database Foundation
  1. Database Layer (Task Group 1)

Phase 2: Core Services
  2. Tool Gateway and Tool System (Task Group 2)
  3. Permission System and Budget Management (Task Group 3)
  4. Agent Abstraction Layer and Context Builder (Task Group 4)
  5. Orchestration Engine (Task Group 5)

Phase 3: API and UI
  6. API Endpoints (Task Group 6)
  7. UI Extensions (Task Group 7)

Phase 4: Integration
  8. Agent Template Seeding and Final Integration (Task Group 8)
  9. Test Review and Gap Analysis (Task Group 9)
```

## Key Files Created/Modified

### New Files
- `app/Models/AgentTemplate.php`
- `app/Models/AgentMemory.php`
- `app/Models/AgentWorkflowState.php`
- `app/Models/WorkflowCustomization.php`
- `app/Contracts/Tools/ToolInterface.php`
- `app/Services/ToolGateway.php`
- `app/Services/ToolRegistry.php`
- `app/Services/AgentPermissionService.php`
- `app/Services/AgentBudgetService.php`
- `app/Services/ContextBuilder.php`
- `app/Services/AgentMemoryService.php`
- `app/Services/AgentRunner.php`
- `app/Services/AgentOrchestrator.php`
- `app/Services/AgentApprovalService.php`
- `app/Agents/BaseAgent.php`
- `app/Agents/Workflows/BaseAgentWorkflow.php`
- `app/Agents/Tools/TaskListTool.php`
- `app/Agents/Tools/WorkOrderInfoTool.php`
- `app/Agents/Tools/CreateNoteTool.php`
- `app/ValueObjects/ToolResult.php`
- `app/ValueObjects/AgentContext.php`
- `app/Providers/AgentServiceProvider.php`
- `app/Http/Controllers/Settings/AgentTemplateController.php`
- `app/Http/Controllers/Settings/AgentActivityController.php`
- `app/Http/Controllers/Settings/AgentWorkflowController.php`
- `app/Http/Resources/AgentTemplateResource.php`
- `app/Http/Resources/AgentActivityResource.php`
- `app/Http/Resources/AgentWorkflowStateResource.php`
- `app/Console/Commands/ResetDailySpendCommand.php`
- `config/agent-tools/schema.json`
- `config/agent-tools/task-list.json`
- `config/agent-tools/work-order-info.json`
- `config/agent-tools/create-note.json`
- `config/agent-permissions.php`
- `database/migrations/xxxx_create_agent_templates_table.php`
- `database/migrations/xxxx_create_agent_memories_table.php`
- `database/migrations/xxxx_create_agent_workflow_states_table.php`
- `database/migrations/xxxx_create_workflow_customizations_table.php`
- `database/migrations/xxxx_add_fields_to_ai_agents_table.php`
- `database/migrations/xxxx_add_fields_to_agent_configurations_table.php`
- `database/migrations/xxxx_add_fields_to_agent_activity_logs_table.php`
- `database/migrations/xxxx_add_fields_to_global_ai_settings_table.php`
- `database/seeders/AgentTemplateSeeder.php`
- `resources/js/components/agents/AgentPermissionsPanel.tsx`
- `resources/js/components/agents/AgentToolsPanel.tsx`
- `resources/js/components/agents/ActivityDetailModal.tsx`
- `resources/js/components/agents/AgentTemplateSelector.tsx`
- `resources/js/components/agents/AgentApprovalItem.tsx`
- `resources/js/components/agents/BudgetDisplay.tsx`
- `resources/js/components/agents/index.ts`
- `resources/js/components/agents/__tests__/agent-ui-components.test.tsx`
- `tests/Feature/Agents/AgentApiTest.php`
- `tests/Feature/Agents/AgentIntegrationTest.php`

### Modified Files
- `app/Models/AIAgent.php` - Add template relationship
- `app/Models/AgentConfiguration.php` - Add new permission fields
- `app/Models/AgentActivityLog.php` - Add tool_calls, context_accessed fields
- `app/Models/GlobalAISettings.php` - Add retention and approval settings
- `app/Http/Controllers/Settings/AIAgentsController.php` - Add store, update, updateConfiguration, run, activity methods
- `app/Enums/ApprovalStatus.php` - Add label() method
- `app/Enums/AgentType.php` - Add label() method
- `bootstrap/providers.php` - Register AgentServiceProvider
- `routes/console.php` - Schedule daily spend reset
- `routes/settings.php` - Add new agent routes
- `database/seeders/DatabaseSeeder.php` - Include AgentTemplateSeeder
- `resources/js/pages/settings/components/ai-agents-section.tsx` - Integrate new agent components with tabs for Config, Tools, Activity, Budget
- `resources/js/types/settings.d.ts` - Add extended types for agents, tools, templates
- `resources/js/types/inbox.d.ts` - Add agent workflow approval types

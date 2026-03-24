# Specification: AI Agent Foundation and Tool Gateway

## Goal
Establish the foundational infrastructure for AI agents including an agent abstraction layer, centralized tool gateway with permission enforcement, orchestration engine for multi-agent workflows, and extended audit logging to support all subsequent agent implementations.

## User Stories
- As a team admin, I want to configure which tools agents can access so that I can control their capabilities within my organization's security requirements.
- As an operations manager, I want agents to pause and await human approval for high-risk actions so that critical decisions remain under human oversight.
- As a workspace owner, I want comprehensive logs of all agent actions and tool calls so that I can audit agent behavior and ensure compliance.

## Specific Requirements

**Agent Abstraction Layer**
- Create a base `BaseAgent` class extending neuron-ai's `Agent` class with Workumi-specific behaviors
- Implement `provider()` to return configured AI provider based on GlobalAISettings
- Implement `instructions()` to load system prompt from agent configuration
- Implement `tools()` to return tools filtered through Tool Gateway permissions
- Add budget checking before each agent run using existing AgentConfiguration limits
- Support multi-turn conversation via neuron-ai's built-in message history
- Integrate with existing AIAgent, AgentConfiguration models rather than replacing them

**Tool Gateway Architecture**
- Create `ToolGateway` service as single entry point for all agent tool execution
- Enforce permission checks at gateway level before delegating to tool implementation
- Load tool definitions from JSON configuration files in `config/agent-tools/` directory
- Implement tool registration system using Laravel service container
- Log all tool execution attempts (success, denied, failed) to extended AgentActivityLog
- Provide `ToolInterface` contract that all tools must implement
- Tools must NOT self-check permissions; gateway handles all authorization

**Permission System**
- Extend existing category-based permissions from AgentConfiguration (can_create_work_orders, can_modify_tasks, can_access_client_data, can_send_emails)
- Add new permission categories: `can_modify_deliverables`, `can_access_financial_data`, `can_modify_playbooks`
- Enforce system-level human approval requirements for: external sends, contracts, financial transactions, scope changes
- Create `AgentPermissionService` to centralize permission checking logic
- Permission checks use existing GlobalAISettings approval flags as overrides

**Budget and Capacity Management**
- Leverage existing daily/monthly budget caps in AgentConfiguration
- Add budget validation in BaseAgent before initiating LLM calls
- Decrement budget in real-time using AgentActivityLog cost tracking
- Add `daily_spend` field to AgentConfiguration for daily cap enforcement
- Reset daily_spend via scheduled command at midnight

**Context Builder Component**
- Create `ContextBuilder` service to assemble relevant context for agent runs
- Support three memory scopes: Project (work orders, tasks), Client (party history), Org (team patterns)
- Create `AgentMemory` model for persistent context storage across agent sessions
- Load context based on the entity being operated on (task, work order, project, party)
- Implement context size limits to stay within LLM token budgets
- Prioritize recent and relevant context when truncation is necessary

**Orchestration Engine**
- Create `AgentOrchestrator` service for coordinating multi-agent workflows
- Use neuron-ai's native Workflow system for core workflow definitions in PHP
- Store team customizations (enable/disable steps, parameters) in database via `WorkflowCustomization` model
- Create `AgentWorkflowState` model for pause/resume capability with database persistence
- Integrate with Human Checkpoint Workflow pattern from WorkflowTransitionService
- Create InboxItems for agent actions requiring human approval
- Resume workflows after approval using stored state

**Extended Audit Logging**
- Add `tool_calls` JSON field to AgentActivityLog for detailed tool execution records
- Add `context_accessed` JSON field to track which memory/context was used
- Add `workflow_state_id` field to link activity to workflow executions
- Add `retention_days` field to GlobalAISettings for configurable log retention
- Store enough data for replay capability (input, output, tool calls, context)

**Agent Template System**
- Create `AgentTemplate` model for storing pre-built agent configurations
- Templates include: code, name, type, default_instructions, default_tools, default_permissions
- Seed database with template library: Dispatcher, PM Copilot, QA/Compliance, Finance, Client Comms, Domain Skills
- Teams can create agents from templates or define fully custom agents
- Teams can disable/enable agents in their workspace
- Custom agents stored in AIAgent with `is_custom` flag and `template_id` reference

## Visual Design

**`planning/visuals/Screenshot 2026-01-19 at 21.38.08.png`**
- Global AI Budget display at top: Monthly Budget, Current Spend, Remaining
- Agent list showing name, description, monthly spend, enabled/disabled status
- Expandable rows for agent details with chevron indicator
- Dark theme with emerald accent for enabled states
- Preserve this structure; add "Tools" and "Permissions" tabs within expanded agent view

**`planning/visuals/Screenshot 2026-01-19 at 21.38.15.png`**
- Config tab with Enable Agent toggle, Daily Run Limit, Monthly Budget Cap inputs
- Three-tab structure: Config, Activity, Budget
- Extend Config tab to include tool category toggles and permission checkboxes
- Add collapsible "Advanced Settings" section for verbosity, creativity, risk tolerance

**`planning/visuals/Screenshot 2026-01-19 at 21.38.24.png`**
- Activity tab showing individual runs with timestamp, cost, description, approval status
- Each activity entry shows approved/rejected badge
- Extend entries to show tool calls made (collapsible detail view)
- Add filter by approval status and date range

**`planning/visuals/Screenshot 2026-01-19 at 21.38.31.png`**
- Budget tab with Budget Cap, Spent, Remaining values and visual progress bar
- Add daily budget display alongside monthly
- Add cost breakdown by tool category (pie chart or bar)

## Existing Code to Leverage

**AIAgent Model (`app/Models/AIAgent.php`)**
- Extend with relationships to AgentTemplate, AgentWorkflowState
- Add `is_custom` boolean and `template_id` foreign key fields
- Preserve existing `code`, `name`, `type`, `description`, `capabilities` fields

**AgentConfiguration Model (`app/Models/AgentConfiguration.php`)**
- Add new permission fields: `can_modify_deliverables`, `can_access_financial_data`, `can_modify_playbooks`
- Add `daily_spend` decimal field for daily budget tracking
- Add `tool_permissions` JSON field for granular tool-level overrides if needed later

**AgentActivityLog Model (`app/Models/AgentActivityLog.php`)**
- Add `tool_calls` JSON field for array of tool execution records
- Add `context_accessed` JSON field for memory/context audit trail
- Add `workflow_state_id` nullable foreign key for workflow tracking

**WorkflowTransitionService (`app/Services/WorkflowTransitionService.php`)**
- Use AI_RESTRICTED_TRANSITIONS pattern for agent checkpoint enforcement
- Follow InboxItem creation pattern for agent approval requests
- Reference `validateAIAgentPermission` method for consistent AI restriction checks

**InboxItem Model (`app/Models/InboxItem.php`)**
- Use as pattern for surfacing agent approval requests to humans/
- Leverage `approvable` morph relationship for linking to agent workflow states
- Follow `markAsApproved`/`markAsRejected` pattern for approval resolution

## Out of Scope
- Specific agent implementations (Dispatcher, PM Copilot, QA, Finance, etc.)
- Agent-specific tools and capabilities beyond foundation infrastructure
- Agent training, fine-tuning, or prompt engineering
- Natural language agent configuration (UI-based only)
- Public API for third-party agent integrations
- Agent-to-agent direct communication (all coordination through orchestrator)
- Real-time collaboration features for agent outputs
- Embedding/RAG infrastructure (separate spec if needed)
- MCP (Model Context Protocol) server integration
- Automated agent testing framework

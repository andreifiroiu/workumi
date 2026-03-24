<?php

declare(strict_types=1);

namespace App\Agents;

use App\Contracts\Tools\ToolInterface;
use App\Enums\AIConfidence;

/**
 * PM Copilot Agent for project management assistance.
 *
 * Assists with project management tasks including:
 * - Creating deliverables from work order descriptions
 * - Breaking down work orders into tasks with LLM-based estimates
 * - Providing project insights (bottleneck identification, overdue flagging, scope creep detection)
 */
class PMCopilotAgent extends BaseAgent
{
    /**
     * Get the base instructions for the PM Copilot Agent.
     *
     * Provides PM-specific instructions for deliverable generation,
     * task breakdown, and project insights.
     */
    public function getBaseInstructions(): string
    {
        // Check for custom instructions in configuration first
        $customInstructions = $this->configuration->custom_instructions ?? null;

        if ($customInstructions !== null && $customInstructions !== '') {
            return $customInstructions;
        }

        return $this->getPMCopilotInstructions();
    }

    /**
     * Get the Workumi tools available to the PM Copilot Agent.
     *
     * Returns PM-specific tools filtered through ToolGateway permissions.
     *
     * @return array<string, ToolInterface>
     */
    public function getLaboTools(): array
    {
        $allTools = parent::getLaboTools();

        // Filter to only include PM-relevant tools
        $pmToolNames = [
            'work-order-info',
            'get-playbooks',
            'get-documents',
            'task-list',
            'get-team-capacity',
        ];

        return array_filter(
            $allTools,
            fn (ToolInterface $tool) => in_array($tool->name(), $pmToolNames, true)
        );
    }

    /**
     * Determine confidence level for deliverable suggestions.
     *
     * @param  bool  $hasDescription  Whether the work order has a clear description
     * @param  bool  $hasAcceptanceCriteria  Whether acceptance criteria are defined
     * @param  float  $playbookMatchScore  Score (0-1) indicating playbook template relevance
     */
    public function determineDeliverableConfidence(
        bool $hasDescription,
        bool $hasAcceptanceCriteria,
        float $playbookMatchScore
    ): AIConfidence {
        // High confidence: clear description, acceptance criteria, and strong playbook match
        if ($hasDescription && $hasAcceptanceCriteria && $playbookMatchScore >= 0.7) {
            return AIConfidence::High;
        }

        // Medium confidence: has description and either criteria or moderate playbook match
        if ($hasDescription && ($hasAcceptanceCriteria || $playbookMatchScore >= 0.4)) {
            return AIConfidence::Medium;
        }

        // Low confidence: missing description or insufficient context
        return AIConfidence::Low;
    }

    /**
     * Determine confidence level for task breakdown suggestions.
     *
     * @param  bool  $hasDetailedScope  Whether the work order has detailed scope
     * @param  bool  $hasEstimate  Whether estimation data is available
     * @param  bool  $playbookPatternMatch  Whether a playbook task pattern matches
     */
    public function determineTaskConfidence(
        bool $hasDetailedScope,
        bool $hasEstimate,
        bool $playbookPatternMatch
    ): AIConfidence {
        // High confidence: detailed scope, estimate available, and playbook pattern
        if ($hasDetailedScope && $hasEstimate && $playbookPatternMatch) {
            return AIConfidence::High;
        }

        // Medium confidence: detailed scope with either estimate or playbook pattern
        if ($hasDetailedScope && ($hasEstimate || $playbookPatternMatch)) {
            return AIConfidence::Medium;
        }

        // Low confidence: minimal information available
        return AIConfidence::Low;
    }

    /**
     * Determine confidence level for project insights.
     *
     * @param  int  $dataPointCount  Number of data points supporting the insight
     * @param  float  $signalStrength  Signal strength (0-1) of the insight pattern
     * @param  bool  $historicalBaseline  Whether historical baseline data is available
     */
    public function determineInsightConfidence(
        int $dataPointCount,
        float $signalStrength,
        bool $historicalBaseline
    ): AIConfidence {
        // High confidence: sufficient data points, strong signal, and baseline
        if ($dataPointCount >= 8 && $signalStrength >= 0.7 && $historicalBaseline) {
            return AIConfidence::High;
        }

        // Medium confidence: moderate data or signal strength
        if ($dataPointCount >= 4 && $signalStrength >= 0.4) {
            return AIConfidence::Medium;
        }

        // Low confidence: limited data or weak signal
        return AIConfidence::Low;
    }

    /**
     * Get the default PM Copilot instructions.
     */
    private function getPMCopilotInstructions(): string
    {
        return <<<'INSTRUCTIONS'
You are the PM Copilot Agent, an AI assistant specialized in project management tasks. Your role is to help project managers and team leads efficiently plan and manage work.

## Your Primary Responsibilities

1. **Deliverable Generation**: Analyze work order descriptions and create structured deliverables
   - Extract key objectives from work order title, description, and scope
   - Query playbooks for relevant templates and SOPs
   - Generate 2-3 alternative deliverable structures with confidence levels
   - Include title, description, type, and acceptance criteria for each deliverable

2. **Task Breakdown**: Break work orders into actionable tasks with estimates
   - Analyze deliverables and work order context
   - Reference playbooks for standard task patterns
   - Generate tasks with position ordering and dependencies
   - Provide LLM-based duration estimates via estimated_hours
   - Include checklist items from playbook templates when applicable
   - Present 2-3 task breakdown alternatives with confidence levels

3. **Project Insights**: Analyze project data to identify issues proactively
   - Flag overdue tasks, deliverables, and work orders
   - Identify bottlenecks from blocked tasks and blocker reasons
   - Suggest resource reallocation based on capacity vs workload
   - Detect scope creep by comparing estimates to actual progress

## Tools Available

- **work-order-info**: Retrieve work order details including tasks and deliverables
- **get-playbooks**: Query playbooks by tags, type, and search terms for templates
- **get-documents**: List documents attached to a project or work order (metadata and URLs)
- **task-list**: List tasks for a work order or project
- **get-team-capacity**: Query team member availability for resource insights

## Response Format

Structure your recommendations as JSON for programmatic processing:

```json
{
  "deliverable_alternatives": [
    {
      "title": "...",
      "description": "...",
      "type": "...",
      "acceptance_criteria": ["..."],
      "confidence": "high|medium|low",
      "reasoning": "..."
    }
  ],
  "task_breakdown_alternatives": [
    {
      "tasks": [
        {
          "title": "...",
          "description": "...",
          "estimated_hours": 0.0,
          "position_in_work_order": 1,
          "checklist_items": ["..."],
          "dependencies": [],
          "confidence": "high|medium|low"
        }
      ],
      "total_estimated_hours": 0.0,
      "confidence": "high|medium|low"
    }
  ],
  "insights": [
    {
      "type": "overdue|bottleneck|resource|scope_creep",
      "severity": "high|medium|low",
      "title": "...",
      "description": "...",
      "affected_items": [...],
      "suggestion": "...",
      "confidence": "high|medium|low"
    }
  ]
}
```

## Confidence Level Guidelines

**High Confidence:**
- Clear, detailed work order description and acceptance criteria
- Strong playbook template match (>70% relevance)
- Sufficient historical data for estimates
- Multiple corroborating data points for insights

**Medium Confidence:**
- Adequate description with some ambiguity
- Partial playbook match or moderate relevance
- Limited historical data but reasonable patterns
- Some supporting evidence for insights

**Low Confidence:**
- Vague or missing description
- No applicable playbook templates
- Insufficient data for reliable estimates
- Weak or conflicting signals for insights

## Important Guidelines

- Always present multiple alternatives to give users choice
- Clearly explain the reasoning behind each recommendation
- Use playbooks to ensure consistency with team standards
- Flag any assumptions made due to missing information
- Do NOT modify budget values or team member assignments
- Do NOT bypass ToolGateway permission checks
- Keep all operations within single project context
INSTRUCTIONS;
    }
}

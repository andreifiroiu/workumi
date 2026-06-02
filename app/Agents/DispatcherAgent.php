<?php

declare(strict_types=1);

namespace App\Agents;

use App\Contracts\Tools\ToolInterface;
use App\Enums\AIConfidence;

/**
 * Dispatcher Agent for routing work to team members.
 *
 * Monitors message threads linked to work orders when tagged by users,
 * extracts work requirements from messages, and routes work to appropriate
 * team members based on skills and capacity, creating draft work orders
 * for human review with detailed routing reasoning.
 */
class DispatcherAgent extends BaseAgent
{
    /**
     * Get the base instructions for the Dispatcher Agent.
     *
     * Provides dispatcher-specific instructions for work routing,
     * requirement extraction, and team member matching.
     */
    public function getBaseInstructions(): string
    {
        // Check for custom instructions in configuration first
        $customInstructions = $this->configuration->custom_instructions ?? null;

        if ($customInstructions !== null && $customInstructions !== '') {
            return $customInstructions;
        }

        return $this->getDispatcherInstructions();
    }

    /**
     * Get the Workumi tools available to the Dispatcher Agent.
     *
     * The dispatcher is an ANALYZER: it inspects skills, capacity, playbooks and
     * existing work, then returns a structured plan. It is intentionally given
     * READ-ONLY tools. Entity creation is performed by the caller (e.g. the
     * ProcessInboundEmail job) so that creation can be gated by confidence and
     * never happens twice (once in the chat tool-loop and once by the caller).
     *
     * @return array<string, ToolInterface>
     */
    public function getLaboTools(): array
    {
        $allTools = parent::getLaboTools();

        // Read-only tools only — the dispatcher must not mutate state directly.
        $dispatcherToolNames = [
            'get-team-skills',
            'get-team-capacity',
            'get-playbooks',
            'get-documents',
            'work-order-info',
        ];

        return array_filter(
            $allTools,
            fn (ToolInterface $tool) => in_array($tool->name(), $dispatcherToolNames, true)
        );
    }

    /**
     * Extract work requirements from message content.
     *
     * Parses unstructured message content into structured work requirement fields.
     *
     * @param  string  $messageContent  The message content to extract requirements from
     * @return array{
     *     title: array{value: string|null, confidence: AIConfidence},
     *     description: array{value: string|null, confidence: AIConfidence},
     *     scope: array{value: string|null, confidence: AIConfidence},
     *     success_criteria: array{value: array<string>|null, confidence: AIConfidence},
     *     estimated_hours: array{value: float|null, confidence: AIConfidence},
     *     priority: array{value: string|null, confidence: AIConfidence},
     *     deadline: array{value: string|null, confidence: AIConfidence}
     * }
     */
    public function extractWorkRequirements(string $messageContent): array
    {
        // This method provides the structure for work requirement extraction
        // Actual LLM-based extraction will be implemented in WorkRequirementExtractor service
        return [
            'title' => ['value' => null, 'confidence' => AIConfidence::Low],
            'description' => ['value' => null, 'confidence' => AIConfidence::Low],
            'scope' => ['value' => null, 'confidence' => AIConfidence::Low],
            'success_criteria' => ['value' => null, 'confidence' => AIConfidence::Low],
            'estimated_hours' => ['value' => null, 'confidence' => AIConfidence::Low],
            'priority' => ['value' => null, 'confidence' => AIConfidence::Low],
            'deadline' => ['value' => null, 'confidence' => AIConfidence::Low],
        ];
    }

    /**
     * Calculate routing score for a team member.
     *
     * Combines skill match score (50%) and capacity score (50%) for final ranking.
     *
     * @param  float  $skillScore  Skill match score (0-100)
     * @param  float  $capacityScore  Capacity score (0-100)
     * @return float Combined routing score (0-100)
     */
    public function calculateRoutingScore(float $skillScore, float $capacityScore): float
    {
        $skillWeight = 0.5;
        $capacityWeight = 0.5;

        return ($skillScore * $skillWeight) + ($capacityScore * $capacityWeight);
    }

    /**
     * Determine if multiple routing options should be presented.
     *
     * When top candidates are within 10% score difference, present multiple options.
     *
     * @param  array<int, float>  $scores  Array of candidate scores indexed by user_id
     * @return array<int> User IDs of top candidates to present
     */
    public function getTopCandidates(array $scores): array
    {
        if (empty($scores)) {
            return [];
        }

        // Sort scores descending
        arsort($scores);

        $topScore = reset($scores);
        $threshold = $topScore * 0.9; // Within 10% of top score

        $candidates = [];
        foreach ($scores as $userId => $score) {
            if ($score >= $threshold || count($candidates) < 3) {
                $candidates[] = $userId;
            }

            // Always present at least top 3 when available
            if (count($candidates) >= 3 && $score < $threshold) {
                break;
            }
        }

        return $candidates;
    }

    /**
     * Determine confidence level for a routing recommendation.
     *
     * @param  float  $score  The routing score (0-100)
     * @param  int  $skillMatchCount  Number of matching skills found
     * @param  float  $availableCapacity  Available capacity in hours
     * @param  float  $requiredHours  Estimated hours for the work
     */
    public function determineRoutingConfidence(
        float $score,
        int $skillMatchCount,
        float $availableCapacity,
        float $requiredHours
    ): AIConfidence {
        // High confidence: score >= 80, multiple skill matches, sufficient capacity
        if ($score >= 80 && $skillMatchCount >= 2 && $availableCapacity >= $requiredHours) {
            return AIConfidence::High;
        }

        // Medium confidence: score >= 50, at least one skill match, some capacity
        if ($score >= 50 && $skillMatchCount >= 1 && $availableCapacity > 0) {
            return AIConfidence::Medium;
        }

        // Low confidence: low score, no skill matches, or insufficient capacity
        return AIConfidence::Low;
    }

    /**
     * Get the default dispatcher instructions.
     */
    private function getDispatcherInstructions(): string
    {
        return <<<'INSTRUCTIONS'
You are the Dispatcher Agent, responsible for routing work to appropriate team members based on their skills and capacity.

## Your Primary Responsibilities

1. **Analyze Message Threads**: When tagged in a work order message thread, analyze the full conversation context to understand the work requirements.

2. **Extract Work Requirements**: Parse messages to identify:
   - Title and description of the work
   - Scope and deliverables
   - Success criteria and acceptance conditions
   - Estimated hours and budget
   - Priority level and deadline

3. **Match Skills**: Query team member skills and match them against work requirements:
   - Consider proficiency levels (1=Basic, 2=Intermediate, 3=Advanced)
   - Weight advanced skills higher in routing decisions
   - Look for semantic matches when exact skill names don't match

4. **Assess Capacity**: Evaluate team member availability:
   - Check available capacity (capacity_hours_per_week - current_workload_hours)
   - Penalize members with less than 20% available capacity
   - Compare available capacity against estimated hours

5. **Calculate Routing Scores**: Combine skill match (50%) and capacity (50%) scores:
   - Present top candidates when scores are within 10% of each other
   - Always present at least 3 candidates when available
   - Include confidence level for each recommendation

6. **Create Draft Work Orders**: For selected routing recommendations:
   - Create work orders with Draft status
   - Populate all extracted fields
   - Set responsible_id to top-ranked candidate
   - Include detailed routing reasoning in metadata

## Inbound Email Triage

When the input is an inbound email (subject + body from an external sender), your job is to
convert it into a PROPOSAL for actionable work. You do NOT create anything yourself — you
return JSON and a separate system decides what to persist based on your confidence. Decide
what should be created:

- **Project**: a new, distinct body of work that is not part of an existing project.
- **WorkOrder**: a scoped piece of work; it will be attached to a project (the system supplies
  a default project_id when no better project applies).
- **Task**: a single action item; it will be attached to a work order.

For every entity you propose, assign a `confidence` of `high`, `medium`, or `low`:
- **high**: the email clearly and unambiguously describes this entity (created live).
- **medium**: reasonable inference but some details are assumed (created as a draft for review).
- **low**: speculative; a human must review before it is created.

## Tools Available (read-only)

- **get-team-skills**: Query team member skills and proficiency levels
- **get-team-capacity**: Get capacity and workload for team members
- **get-playbooks**: Search for relevant SOPs and templates
- **get-documents**: List documents attached to a project or work order (metadata and URLs)
- **work-order-info**: Get details about existing work orders

These tools are for analysis only. Never assume you can create or modify records; express all
proposed work through the JSON response below.

## Response Format

For inbound email triage, return ONLY JSON describing the proposed entities:
```json
{
  "entities": [
    {
      "kind": "project|work_order|task",
      "title": "...",
      "description": "...",
      "priority": "low|medium|high|urgent",
      "due_date": "YYYY-MM-DD",
      "confidence": "high|medium|low"
    }
  ],
  "summary": "Brief explanation of the triage decision"
}
```

For thread-based routing recommendations, use this format:

When providing routing recommendations, structure your response as JSON:
```json
{
  "extracted_requirements": {
    "title": { "value": "...", "confidence": "high|medium|low" },
    "description": { "value": "...", "confidence": "high|medium|low" },
    ...
  },
  "routing_candidates": [
    {
      "user_id": 123,
      "user_name": "...",
      "skill_score": 85,
      "capacity_score": 70,
      "combined_score": 77.5,
      "confidence": "high|medium|low",
      "reasoning": "..."
    }
  ],
  "recommended_playbooks": [...]
}
```

Always be thorough in your analysis and transparent in your reasoning.
INSTRUCTIONS;
    }
}

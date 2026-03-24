<?php

declare(strict_types=1);

namespace App\Agents;

use App\Contracts\Tools\ToolInterface;
use App\Enums\AIConfidence;
use App\Models\Party;

/**
 * Client Comms Agent for drafting professional client communications.
 *
 * Assists with drafting client-facing communications including:
 * - Status updates on project/work order progress
 * - Deliverable notifications when work is ready
 * - Clarification requests for missing information
 * - Milestone announcements for significant achievements
 *
 * All communications require human approval before delivery.
 */
class ClientCommsAgent extends BaseAgent
{
    /**
     * Communication-relevant tool names.
     *
     * @var array<string>
     */
    private const COMMUNICATION_TOOLS = [
        'work-order-info',
        'project-info',
        'get-playbooks',
        'get-documents',
        'party-info',
        'draft-communication',
        'get-thread-history',
    ];

    /**
     * Supported languages with their full names.
     *
     * @var array<string, string>
     */
    private const SUPPORTED_LANGUAGES = [
        'en' => 'English',
        'es' => 'Spanish',
        'fr' => 'French',
        'de' => 'German',
        'pt' => 'Portuguese',
        'it' => 'Italian',
        'nl' => 'Dutch',
        'pl' => 'Polish',
        'ro' => 'Romanian',
    ];

    /**
     * Get the base instructions for the Client Comms Agent.
     *
     * Provides communication-specific instructions for drafting professional
     * client-facing messages with appropriate tone and formatting.
     */
    public function getBaseInstructions(): string
    {
        // Check for custom instructions in configuration first
        $customInstructions = $this->configuration->custom_instructions ?? null;

        if ($customInstructions !== null && $customInstructions !== '') {
            return $customInstructions;
        }

        return $this->getClientCommsInstructions();
    }

    /**
     * Get the Workumi tools available to the Client Comms Agent.
     *
     * Returns communication-specific tools filtered through ToolGateway permissions.
     *
     * @return array<string, ToolInterface>
     */
    public function getLaboTools(): array
    {
        $allTools = parent::getLaboTools();

        // Filter to only include communication-relevant tools
        return array_filter(
            $allTools,
            fn (ToolInterface $tool) => in_array($tool->name(), self::COMMUNICATION_TOOLS, true)
        );
    }

    /**
     * Determine confidence level for status update communications.
     *
     * @param  bool  $hasRecentActivity  Whether the entity has recent activity to report
     * @param  bool  $hasStatusTransitions  Whether there are status transitions to mention
     * @param  float  $contextCompleteness  Score (0-1) indicating how complete the context is
     */
    public function determineStatusUpdateConfidence(
        bool $hasRecentActivity,
        bool $hasStatusTransitions,
        float $contextCompleteness
    ): AIConfidence {
        // High confidence: recent activity, status transitions, and high context completeness
        if ($hasRecentActivity && $hasStatusTransitions && $contextCompleteness >= 0.7) {
            return AIConfidence::High;
        }

        // Medium confidence: has activity or transitions with moderate context
        if (($hasRecentActivity || $hasStatusTransitions) && $contextCompleteness >= 0.4) {
            return AIConfidence::Medium;
        }

        // Low confidence: missing activity or low context completeness
        return AIConfidence::Low;
    }

    /**
     * Determine confidence level for deliverable notification communications.
     *
     * @param  bool  $hasDeliverableDetails  Whether deliverable details are available
     * @param  bool  $hasAcceptanceCriteria  Whether acceptance criteria are defined
     */
    public function determineDeliverableNotificationConfidence(
        bool $hasDeliverableDetails,
        bool $hasAcceptanceCriteria
    ): AIConfidence {
        // High confidence: clear details and acceptance criteria
        if ($hasDeliverableDetails && $hasAcceptanceCriteria) {
            return AIConfidence::High;
        }

        // Medium confidence: has details but no criteria
        if ($hasDeliverableDetails) {
            return AIConfidence::Medium;
        }

        // Low confidence: missing deliverable details
        return AIConfidence::Low;
    }

    /**
     * Determine confidence level for clarification request communications.
     *
     * @param  bool  $hasUnclearItems  Whether there are specific unclear items identified
     * @param  bool  $hasQuestions  Whether specific questions have been formulated
     */
    public function determineClarificationConfidence(
        bool $hasUnclearItems,
        bool $hasQuestions
    ): AIConfidence {
        // High confidence: clear items and specific questions
        if ($hasUnclearItems && $hasQuestions) {
            return AIConfidence::High;
        }

        // Medium confidence: has items or questions but not both
        if ($hasUnclearItems || $hasQuestions) {
            return AIConfidence::Medium;
        }

        // Low confidence: no clear basis for clarification
        return AIConfidence::Low;
    }

    /**
     * Determine confidence level for milestone announcement communications.
     *
     * @param  bool  $hasMilestoneData  Whether milestone details are available
     * @param  bool  $hasProgressMetrics  Whether progress metrics are available
     */
    public function determineMilestoneConfidence(
        bool $hasMilestoneData,
        bool $hasProgressMetrics
    ): AIConfidence {
        // High confidence: milestone data and progress metrics
        if ($hasMilestoneData && $hasProgressMetrics) {
            return AIConfidence::High;
        }

        // Medium confidence: has milestone data but no metrics
        if ($hasMilestoneData) {
            return AIConfidence::Medium;
        }

        // Low confidence: missing milestone data
        return AIConfidence::Low;
    }

    /**
     * Get the target language for communication.
     *
     * Returns the language from context or Party preference, defaulting to English.
     */
    public function getTargetLanguage(?Party $party = null): string
    {
        // Check context metadata for language override
        if ($this->context !== null) {
            $contextLanguage = $this->context->metadata['target_language'] ?? null;
            if ($contextLanguage !== null && is_string($contextLanguage)) {
                return $contextLanguage;
            }
        }

        // Get from Party preference
        if ($party !== null) {
            return $party->preferred_language;
        }

        // Default to English
        return 'en';
    }

    /**
     * Build language-specific prompt instructions.
     *
     * @param  string  $language  The ISO 639-1 language code
     */
    public function buildLanguageInstructions(string $language): string
    {
        $languageName = self::SUPPORTED_LANGUAGES[$language] ?? 'English';

        return <<<LANGUAGE
## Language Requirements

Draft all communications in **{$languageName}**.

Guidelines for {$languageName} communications:
- Use appropriate formal/informal register based on client relationship
- Ensure proper grammar and spelling for the target language
- Maintain professional tone while being culturally appropriate
- Use language-specific date and number formats where applicable
- If technical terms do not have common translations, keep them in English with brief explanation

LANGUAGE;
    }

    /**
     * Get the default Client Comms Agent instructions.
     */
    private function getClientCommsInstructions(): string
    {
        return <<<'INSTRUCTIONS'
You are the Client Communication Agent, an AI assistant specialized in drafting professional client-facing communications. Your role is to help project managers maintain consistent, clear, and professional communication with clients without manual composition overhead.

## Your Primary Responsibilities

1. **Status Updates**: Draft progress updates on projects and work orders
   - Summarize recent activities and accomplishments
   - Highlight status transitions and what they mean
   - Include relevant metrics (progress percentage, completed items)
   - Set appropriate expectations for next steps
   - Maintain a positive but honest tone

2. **Deliverable Notifications**: Draft notifications when deliverables are ready
   - Clearly describe the deliverable and its purpose
   - Reference acceptance criteria if applicable
   - Provide instructions for review or access
   - Include relevant attachments or links context
   - Request feedback or confirmation as needed

3. **Clarification Requests**: Draft requests for missing information
   - Clearly state what information is needed
   - Explain why the information is important
   - Provide context to help the client understand
   - Suggest options or examples where helpful
   - Set a reasonable response timeline if urgent

4. **Milestone Announcements**: Draft announcements for significant achievements
   - Celebrate the accomplishment appropriately
   - Provide context on what the milestone means
   - Acknowledge contributions if relevant
   - Outline what comes next
   - Express appreciation for client partnership

## Tools Available

- **work-order-info**: Retrieve work order details including tasks, deliverables, and status
- **project-info**: Get project-level information and context
- **get-playbooks**: Query templates and standard communication formats
- **get-documents**: List documents attached to a project or work order (metadata and URLs)
- **party-info**: Get client contact information and preferences
- **draft-communication**: Store drafted communications for approval
- **get-thread-history**: Retrieve previous communication history for context

## Response Format

Structure your draft communications as JSON for programmatic processing:

```json
{
  "communication_type": "status_update|deliverable_notification|clarification_request|milestone_announcement",
  "subject": "Clear, informative subject line",
  "greeting": "Personalized greeting using contact name",
  "body": "Main communication content with proper formatting",
  "closing": "Professional closing with next steps if applicable",
  "signature_context": "Team or sender context for signature",
  "confidence": "high|medium|low",
  "reasoning": "Brief explanation of draft choices and any assumptions made",
  "suggested_followup_date": "ISO date if follow-up is recommended"
}
```

## Tone and Professionalism Guidelines

**Always:**
- Be professional, courteous, and respectful
- Use clear, concise language
- Focus on facts and actionable information
- Maintain a positive but realistic tone
- Personalize when contact information is available
- Proofread for clarity and accuracy

**Never:**
- Use overly casual or slang language
- Make promises the team cannot keep
- Share internal discussions or concerns
- Blame team members or external factors
- Use jargon without explanation
- Be vague about important details

## Confidence Level Guidelines

**High Confidence:**
- Clear context and complete information available
- Previous communication history for reference
- Specific details about status, deliverables, or milestones
- Strong playbook template match

**Medium Confidence:**
- Partial context with some gaps
- Limited communication history
- General but not specific details
- Some assumptions required

**Low Confidence:**
- Minimal context available
- No communication history reference
- Significant details missing
- Multiple assumptions required

## Important Guidelines

- All drafts require human approval before sending - never indicate automatic sending
- Flag any assumptions made due to missing information
- Suggest alternative phrasings for sensitive topics
- Include relevant context that approvers might need
- Do NOT bypass approval workflows under any circumstances
- Do NOT include internal pricing, cost, or financial details unless explicitly requested
- Respect communication preferences stored in Party records
INSTRUCTIONS;
    }
}

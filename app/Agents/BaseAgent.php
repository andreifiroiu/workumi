<?php

declare(strict_types=1);

namespace App\Agents;

use App\Contracts\Tools\ToolInterface;
use App\Models\AgentConfiguration;
use App\Models\AIAgent;
use App\Models\GlobalAISettings;
use App\Services\AgentBudgetService;
use App\Services\AI\NeuronToolAdapter;
use App\Services\AI\ProviderFactory;
use App\Services\ToolGateway;
use App\ValueObjects\AgentContext;
use NeuronAI\Agent;
use NeuronAI\Providers\AIProviderInterface;
use RuntimeException;

/**
 * Base agent class for Workumi AI agents.
 *
 * Extends NeuronAI\Agent to provide real LLM calls while layering
 * Workumi-specific behaviors:
 * - Provider configuration based on GlobalAISettings and TeamApiKey
 * - System prompt loading from AgentConfiguration
 * - Tool filtering through ToolGateway permissions
 * - Budget checking before each run
 */
abstract class BaseAgent extends Agent
{
    /**
     * The AI agent model this agent instance represents.
     */
    protected AIAgent $aiAgent;

    /**
     * The configuration for this agent.
     */
    protected AgentConfiguration $configuration;

    /**
     * The global AI settings for the team.
     */
    protected ?GlobalAISettings $globalSettings = null;

    /**
     * The tool gateway for executing tools.
     */
    protected ToolGateway $toolGateway;

    /**
     * The budget service for cost management.
     */
    protected AgentBudgetService $budgetService;

    /**
     * Context for the current agent run.
     */
    protected ?AgentContext $context = null;

    /**
     * The ID of the user running this agent.
     */
    protected ?int $runningUserId = null;

    /**
     * Message history for multi-turn conversations.
     *
     * @var array<int, array{role: string, content: string}>
     */
    protected array $messageHistory = [];

    public function __construct(
        AIAgent $aiAgent,
        AgentConfiguration $configuration,
        ToolGateway $toolGateway,
        AgentBudgetService $budgetService,
    ) {
        $this->aiAgent = $aiAgent;
        $this->configuration = $configuration;
        $this->toolGateway = $toolGateway;
        $this->budgetService = $budgetService;

        // Load global settings for the team
        $this->globalSettings = GlobalAISettings::where('team_id', $configuration->team_id)->first();
    }

    /**
     * Get the AI provider for NeuronAI.
     *
     * Called by NeuronAI's resolveProvider() during chat().
     * Resolves provider/model/key from configuration hierarchy.
     */
    protected function provider(): AIProviderInterface
    {
        $config = $this->getProviderConfig();

        if ($config['api_key'] === null) {
            throw new RuntimeException('No API key available for provider: '.$config['provider']);
        }

        return ProviderFactory::create($config['provider'], $config['model'], $config['api_key']);
    }

    /**
     * Get the system instructions for NeuronAI.
     *
     * Called by NeuronAI's resolveInstructions() during chat().
     * Returns the full system prompt with base instructions + context.
     */
    public function instructions(): string
    {
        return $this->buildSystemPrompt();
    }

    /**
     * Get the tools for NeuronAI.
     *
     * Called by NeuronAI's getTools() during chat().
     * Returns Workumi tools adapted to NeuronAI format, with
     * execution routed through ToolGateway for permission/budget/audit.
     *
     * @return array<\NeuronAI\Tools\ToolInterface>
     */
    protected function tools(): array
    {
        $labTools = $this->getLaboTools();

        return NeuronToolAdapter::adaptAll(
            $labTools,
            $this->toolGateway,
            $this->aiAgent,
            $this->configuration,
        );
    }

    /**
     * Get the Workumi tools available to this agent.
     *
     * Returns tools filtered through ToolGateway permissions based on
     * the agent's configuration. Override in concrete agents to filter
     * to agent-specific tools.
     *
     * @return array<string, ToolInterface>
     */
    public function getLaboTools(): array
    {
        return $this->toolGateway->getAvailableTools($this->configuration);
    }

    /**
     * Get the base instructions for this agent.
     *
     * Loads from AgentConfiguration or falls back to AIAgent's template instructions.
     * Override in concrete agents to provide agent-specific instructions.
     */
    public function getBaseInstructions(): string
    {
        // Check for custom instructions in configuration
        $customInstructions = $this->configuration->custom_instructions ?? null;

        if ($customInstructions !== null && $customInstructions !== '') {
            return $customInstructions;
        }

        // Fall back to template default instructions
        $template = $this->aiAgent->template;

        if ($template !== null && $template->default_instructions !== null) {
            return $template->default_instructions;
        }

        // Final fallback: generate basic instructions from agent info
        return $this->generateDefaultInstructions();
    }

    /**
     * Get the provider configuration as an array.
     *
     * Uses 3-tier resolution: agent config → template → global settings → defaults.
     *
     * @return array{provider: string, model: string, api_key: string|null}
     */
    public function getProviderConfig(): array
    {
        $provider = $this->configuration->ai_provider
            ?? $this->aiAgent->template?->default_ai_provider
            ?? $this->globalSettings?->default_provider
            ?? 'anthropic';

        $model = $this->configuration->ai_model
            ?? $this->aiAgent->template?->default_ai_model
            ?? $this->globalSettings?->default_model
            ?? 'claude-sonnet-4-20250514';

        return [
            'provider' => $provider,
            'model' => $model,
            'api_key' => $this->getApiKey($provider),
        ];
    }

    /**
     * Check if the agent can run based on budget constraints.
     *
     * @param  float  $estimatedCost  Estimated cost for this run
     */
    public function canRun(float $estimatedCost = 0.01): bool
    {
        if (! $this->configuration->enabled) {
            return false;
        }

        return $this->budgetService->canRun($this->configuration, $estimatedCost);
    }

    /**
     * Set the context for this agent run.
     */
    public function setContext(AgentContext $context): self
    {
        $this->context = $context;

        return $this;
    }

    /**
     * Get the current context.
     */
    public function getContext(): ?AgentContext
    {
        return $this->context;
    }

    /**
     * Add a message to the conversation history.
     *
     * @param  string  $role  The role (user, assistant, system)
     * @param  string  $content  The message content
     */
    public function addMessage(string $role, string $content): self
    {
        $this->messageHistory[] = [
            'role' => $role,
            'content' => $content,
        ];

        return $this;
    }

    /**
     * Get the conversation history.
     *
     * @return array<int, array{role: string, content: string}>
     */
    public function getMessageHistory(): array
    {
        return $this->messageHistory;
    }

    /**
     * Clear the conversation history.
     */
    public function clearHistory(): self
    {
        $this->messageHistory = [];

        return $this;
    }

    /**
     * Set the user running this agent (for API key resolution).
     */
    public function setRunningUser(int $userId): self
    {
        $this->runningUserId = $userId;

        return $this;
    }

    /**
     * Build the full system prompt including context.
     */
    public function buildSystemPrompt(): string
    {
        $parts = [$this->getBaseInstructions()];

        if ($this->context !== null && ! $this->context->isEmpty()) {
            $parts[] = "\n\n## Current Context\n";
            $parts[] = $this->context->toPromptString();
        }

        return implode('', $parts);
    }

    /**
     * Execute a tool through the gateway.
     *
     * @param  string  $toolName  The name of the tool to execute
     * @param  array<string, mixed>  $params  Parameters for the tool
     * @param  float  $estimatedCost  Estimated cost for the execution
     */
    public function executeTool(string $toolName, array $params, float $estimatedCost = 0.0): \App\ValueObjects\ToolResult
    {
        return $this->toolGateway->execute(
            $this->aiAgent,
            $this->configuration,
            $toolName,
            $params,
            $estimatedCost
        );
    }

    /**
     * Get the underlying AIAgent model.
     */
    public function getAIAgent(): AIAgent
    {
        return $this->aiAgent;
    }

    /**
     * Get the agent configuration.
     */
    public function getConfiguration(): AgentConfiguration
    {
        return $this->configuration;
    }

    /**
     * Get the API key for a provider using 3-tier resolution:
     * 1. User's private key (if runningUserId set)
     * 2. Team shared key
     * 3. Environment variable via config
     */
    protected function getApiKey(string $provider): ?string
    {
        $teamId = $this->configuration->team_id;

        return \App\Models\TeamApiKey::resolveKey($provider, $teamId, $this->runningUserId);
    }

    /**
     * Generate default instructions from agent information.
     */
    protected function generateDefaultInstructions(): string
    {
        $name = $this->aiAgent->name;
        $description = $this->aiAgent->description ?? 'an AI assistant';
        $agentTools = $this->aiAgent->tools ?? [];

        $instructions = "You are {$name}, {$description}.";

        if (! empty($agentTools)) {
            $toolList = implode(', ', $agentTools);
            $instructions .= " Your available tools include: {$toolList}.";
        }

        $instructions .= ' Always be helpful, accurate, and professional.';

        return $instructions;
    }

    /**
     * Validate that the agent is properly configured before running.
     *
     * @throws RuntimeException If the agent is not properly configured
     */
    protected function validateConfiguration(): void
    {
        if (! $this->configuration->enabled) {
            throw new RuntimeException('Agent is disabled');
        }

        if ($this->globalSettings === null) {
            throw new RuntimeException('Global AI settings not found for team');
        }
    }
}

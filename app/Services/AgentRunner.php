<?php

declare(strict_types=1);

namespace App\Services;

use App\Agents\BaseAgent;
use App\Agents\ClientCommsAgent;
use App\Agents\DispatcherAgent;
use App\Agents\PMCopilotAgent;
use App\Models\AgentActivityLog;
use App\Models\AgentConfiguration;
use App\Models\AIAgent;
use App\ValueObjects\AgentContext;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Log;
use NeuronAI\Chat\Messages\UserMessage;
use Throwable;

/**
 * Service for orchestrating agent runs.
 *
 * Handles the complete lifecycle of an agent execution:
 * 1. Budget validation
 * 2. Context building
 * 3. Agent execution (via NeuronAI)
 * 4. Activity logging
 */
class AgentRunner
{
    public function __construct(
        private readonly ToolGateway $toolGateway,
        private readonly AgentBudgetService $budgetService,
        private readonly ContextBuilder $contextBuilder,
    ) {}

    /**
     * Run an agent with the given input.
     *
     * Orchestrates: budget check -> context build -> agent execution -> logging
     *
     * @param  AIAgent  $agent  The AI agent to run
     * @param  AgentConfiguration  $config  The agent's configuration
     * @param  array<string, mixed>  $input  Input data for the agent
     * @param  Model|null  $contextEntity  Optional entity to build context from
     * @return AgentActivityLog The activity log entry with results
     */
    public function run(
        AIAgent $agent,
        AgentConfiguration $config,
        array $input,
        ?Model $contextEntity = null,
    ): AgentActivityLog {
        $startTime = hrtime(true);
        $toolCalls = [];
        $contextAccessed = [];
        $output = null;
        $error = null;
        $result = [];

        try {
            // Step 1: Validate budget
            $estimatedCost = $this->estimateCost($input);

            if (! $this->budgetService->canRun($config, $estimatedCost)) {
                $error = 'Budget exceeded: insufficient daily or monthly budget remaining';

                return $this->createActivityLog(
                    agent: $agent,
                    config: $config,
                    runType: 'agent_run',
                    input: $input,
                    output: null,
                    error: $error,
                    toolCalls: [],
                    contextAccessed: [],
                    durationMs: $this->calculateDuration($startTime),
                    tokensUsed: 0,
                    cost: 0.0,
                );
            }

            // Step 2: Build context if entity provided
            $context = null;
            if ($contextEntity !== null) {
                $context = $this->contextBuilder->build($contextEntity, $agent);
                $contextAccessed = $this->recordContextAccessed($context, $contextEntity);
            }

            // Step 3: Execute agent logic
            // Check if input requests a direct tool execution
            if (isset($input['tool']) && isset($input['tool_params'])) {
                $result = $this->executeDirectToolCall($agent, $config, $input);
            } else {
                $result = $this->executeAgent($agent, $config, $input, $context);
            }

            $output = $result['output'];
            $toolCalls = $result['tool_calls'] ?? [];

            // Step 4: Deduct cost after successful execution
            $actualCost = $result['cost'] ?? $estimatedCost;
            $this->budgetService->deductCost($config, $actualCost);

        } catch (Throwable $e) {
            $error = $e->getMessage();

            Log::error('Agent run failed', [
                'agent_id' => $agent->id,
                'config_id' => $config->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
        }

        // Step 5: Create activity log
        return $this->createActivityLog(
            agent: $agent,
            config: $config,
            runType: 'agent_run',
            input: $input,
            output: $output,
            error: $error,
            toolCalls: $toolCalls,
            contextAccessed: $contextAccessed,
            durationMs: $this->calculateDuration($startTime),
            tokensUsed: $result['tokens_used'] ?? 0,
            cost: $result['cost'] ?? 0.0,
        );
    }

    /**
     * Run an agent with a specific prompt.
     *
     * Convenience method for simple prompt-based runs.
     *
     * @param  AIAgent  $agent  The AI agent to run
     * @param  AgentConfiguration  $config  The agent's configuration
     * @param  string  $prompt  The prompt to send to the agent
     * @param  Model|null  $contextEntity  Optional entity to build context from
     * @return AgentActivityLog The activity log entry with results
     */
    public function runWithPrompt(
        AIAgent $agent,
        AgentConfiguration $config,
        string $prompt,
        ?Model $contextEntity = null,
    ): AgentActivityLog {
        return $this->run($agent, $config, ['prompt' => $prompt], $contextEntity);
    }

    /**
     * Execute the agent via NeuronAI chat.
     *
     * Resolves the agent instance, configures it with context, and runs
     * the prompt through the LLM with tool access.
     *
     * @param  AIAgent  $agent  The AI agent
     * @param  AgentConfiguration  $config  The agent's configuration
     * @param  array<string, mixed>  $input  Input data
     * @param  AgentContext|null  $context  Built context
     * @return array{output: string|null, tool_calls: array<int, array<string, mixed>>, cost: float, tokens_used: int}
     */
    protected function executeAgent(
        AIAgent $agent,
        AgentConfiguration $config,
        array $input,
        ?AgentContext $context,
    ): array {
        $prompt = $input['prompt'] ?? json_encode($input);

        // Resolve and configure the agent instance
        $agentInstance = $this->resolveAgentInstance($agent, $config);

        if ($context !== null) {
            $agentInstance->setContext($context);
        }

        // Check if API key is available for real LLM call
        $providerConfig = $agentInstance->getProviderConfig();

        if ($providerConfig['api_key'] === null) {
            // No API key: fall back to placeholder
            $output = $this->generatePlaceholderResponse($agent, $prompt, $context);

            return [
                'output' => $output,
                'tool_calls' => [],
                'cost' => 0.0,
                'tokens_used' => 0,
            ];
        }

        // Execute via NeuronAI chat
        $response = $agentInstance->chat(new UserMessage($prompt));

        $usage = $response->getUsage();
        $inputTokens = $usage?->inputTokens ?? 0;
        $outputTokens = $usage?->outputTokens ?? 0;
        $tokensUsed = $inputTokens + $outputTokens;

        // Estimate cost from tokens
        $cost = $this->calculateCostFromTokens($tokensUsed);

        return [
            'output' => $response->getContent(),
            'tool_calls' => [],
            'cost' => $cost,
            'tokens_used' => $tokensUsed,
        ];
    }

    /**
     * Execute a direct tool call (when input specifies tool + tool_params).
     *
     * @return array{output: string|null, tool_calls: array<int, array<string, mixed>>, cost: float, tokens_used: int}
     */
    protected function executeDirectToolCall(
        AIAgent $agent,
        AgentConfiguration $config,
        array $input,
    ): array {
        $toolName = $input['tool'];
        $toolParams = $input['tool_params'];

        $toolResult = $this->toolGateway->execute(
            $agent,
            $config,
            $toolName,
            $toolParams,
        );

        $toolCalls = [[
            'tool' => $toolName,
            'params' => $toolParams,
            'result' => $toolResult->toArray(),
            'status' => $toolResult->status,
        ]];

        $output = $toolResult->success
            ? json_encode($toolResult->data)
            : "Tool execution failed: {$toolResult->error}";

        return [
            'output' => $output,
            'tool_calls' => $toolCalls,
            'cost' => 0.0,
            'tokens_used' => 0,
        ];
    }

    /**
     * Resolve an AIAgent model into a concrete BaseAgent subclass instance.
     */
    protected function resolveAgentInstance(AIAgent $agent, AgentConfiguration $config): BaseAgent
    {
        $agentClass = $this->resolveAgentClass($agent);

        return new $agentClass(
            $agent,
            $config,
            $this->toolGateway,
            $this->budgetService,
        );
    }

    /**
     * Map an AIAgent model to its concrete agent class.
     *
     * @return class-string<BaseAgent>
     */
    protected function resolveAgentClass(AIAgent $agent): string
    {
        $type = $agent->type instanceof \BackedEnum ? $agent->type->value : $agent->type;
        $templateSlug = $agent->template?->slug ?? $type ?? 'default';

        return match ($templateSlug) {
            'dispatcher', 'work-router', 'work-routing' => DispatcherAgent::class,
            'client-comms', 'communication', 'client-communication' => ClientCommsAgent::class,
            'pm-copilot', 'project-management' => PMCopilotAgent::class,
            default => $this->resolveDefaultAgentClass($agent),
        };
    }

    /**
     * Resolve a default agent class when no specific match is found.
     *
     * Falls back to PMCopilotAgent as the most general-purpose agent.
     *
     * @return class-string<BaseAgent>
     */
    private function resolveDefaultAgentClass(AIAgent $agent): string
    {
        // Check capabilities for hints
        $tools = $agent->tools ?? [];

        if (in_array('routing', $tools, true) || in_array('dispatch', $tools, true)) {
            return DispatcherAgent::class;
        }

        if (in_array('communication', $tools, true) || in_array('client-comms', $tools, true)) {
            return ClientCommsAgent::class;
        }

        // Default to PM Copilot as the most general-purpose agent
        return PMCopilotAgent::class;
    }

    /**
     * Estimate the cost of an agent run based on input.
     */
    protected function estimateCost(array $input): float
    {
        // Base cost estimate
        $baseCost = 0.01;

        // Add cost based on input size
        $inputSize = strlen(json_encode($input) ?: '');
        $inputCost = $inputSize * 0.000001;

        return $baseCost + $inputCost;
    }

    /**
     * Calculate cost from token usage.
     */
    protected function calculateCostFromTokens(int $tokens): float
    {
        // Rough pricing: $0.01 per 1000 tokens
        return ($tokens / 1000) * 0.01;
    }

    /**
     * Calculate duration in milliseconds.
     */
    protected function calculateDuration(int $startTime): int
    {
        return (int) ((hrtime(true) - $startTime) / 1_000_000);
    }

    /**
     * Record which context was accessed for audit trail.
     *
     * @return array<string, mixed>
     */
    protected function recordContextAccessed(?AgentContext $context, Model $entity): array
    {
        if ($context === null) {
            return [];
        }

        $accessed = [
            'entity_type' => class_basename($entity),
            'entity_id' => $entity->getKey(),
        ];

        if (! empty($context->projectContext)) {
            $accessed['project_context'] = array_keys($context->projectContext);
        }

        if (! empty($context->clientContext)) {
            $accessed['client_context'] = array_keys($context->clientContext);
        }

        if (! empty($context->orgContext)) {
            $accessed['org_context'] = array_keys($context->orgContext);
        }

        $accessed['token_estimate'] = $context->getTokenEstimate();

        return $accessed;
    }

    /**
     * Create an activity log entry.
     *
     * @param  array<string, mixed>  $input
     * @param  array<int, array<string, mixed>>  $toolCalls
     * @param  array<string, mixed>  $contextAccessed
     */
    protected function createActivityLog(
        AIAgent $agent,
        AgentConfiguration $config,
        string $runType,
        array $input,
        ?string $output,
        ?string $error,
        array $toolCalls,
        array $contextAccessed,
        int $durationMs,
        int $tokensUsed = 0,
        float $cost = 0.0,
    ): AgentActivityLog {
        return AgentActivityLog::create([
            'team_id' => $config->team_id,
            'ai_agent_id' => $agent->id,
            'run_type' => $runType,
            'input' => is_string($input) ? $input : json_encode($input),
            'output' => $output,
            'tokens_used' => $tokensUsed,
            'cost' => $cost,
            'error' => $error,
            'tool_calls' => $toolCalls,
            'context_accessed' => $contextAccessed,
            'duration_ms' => $durationMs,
        ]);
    }

    /**
     * Generate a placeholder response when no API key is available.
     */
    protected function generatePlaceholderResponse(
        AIAgent $agent,
        string $prompt,
        ?AgentContext $context,
    ): string {
        $agentName = $agent->name;

        $response = "[{$agentName}] Received prompt: ".substr($prompt, 0, 100);

        if ($context !== null && ! $context->isEmpty()) {
            $response .= ' (with context loaded)';
        }

        $response .= "\n\nNote: This is a placeholder response. Configure an API key to enable LLM integration.";

        return $response;
    }
}

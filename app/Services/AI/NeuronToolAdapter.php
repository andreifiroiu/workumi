<?php

declare(strict_types=1);

namespace App\Services\AI;

use App\Contracts\Tools\ToolInterface;
use App\Models\AgentConfiguration;
use App\Models\AIAgent;
use App\Services\ToolGateway;
use NeuronAI\Tools\PropertyType;
use NeuronAI\Tools\Tool;
use NeuronAI\Tools\ToolProperty;

/**
 * Bridges App\Contracts\Tools\ToolInterface to NeuronAI\Tools\Tool.
 *
 * Converts Workumi tool definitions into NeuronAI-compatible tools,
 * routing execution through ToolGateway to preserve permission/budget/audit enforcement.
 */
class NeuronToolAdapter
{
    /**
     * Adapt a single ToolInterface to a NeuronAI Tool.
     */
    public static function adapt(
        ToolInterface $tool,
        ToolGateway $gateway,
        AIAgent $agent,
        AgentConfiguration $config,
    ): Tool {
        $neuronTool = Tool::make(
            name: $tool->name(),
            description: $tool->description(),
        );

        // Convert parameters to ToolProperty objects
        foreach ($tool->getParameters() as $paramName => $paramDef) {
            $neuronTool->addProperty(
                ToolProperty::make(
                    name: $paramName,
                    type: self::mapPropertyType($paramDef['type'] ?? 'string'),
                    description: $paramDef['description'] ?? '',
                    required: $paramDef['required'] ?? false,
                )
            );
        }

        // Set callable that routes through ToolGateway for permission/budget/audit.
        // NeuronAI spreads a keyed array as named arguments (call_user_func($cb, ...$params)),
        // so we capture them via ...$inputs which yields an associative array of the actual values.
        $neuronTool->setCallable(function (mixed ...$inputs) use ($tool, $gateway, $agent, $config) {
            $result = $gateway->execute($agent, $config, $tool->name(), $inputs);

            return $result->success
                ? json_encode($result->data)
                : "Error: {$result->error}";
        });

        return $neuronTool;
    }

    /**
     * Adapt multiple tools at once.
     *
     * @param  array<string, ToolInterface>  $tools
     * @return array<Tool>
     */
    public static function adaptAll(
        array $tools,
        ToolGateway $gateway,
        AIAgent $agent,
        AgentConfiguration $config,
    ): array {
        return array_values(array_map(
            fn (ToolInterface $tool) => self::adapt($tool, $gateway, $agent, $config),
            $tools,
        ));
    }

    /**
     * Map a string type to NeuronAI PropertyType.
     */
    private static function mapPropertyType(string $type): PropertyType
    {
        return match (strtolower($type)) {
            'integer', 'int' => PropertyType::INTEGER,
            'number', 'float', 'double' => PropertyType::NUMBER,
            'boolean', 'bool' => PropertyType::BOOLEAN,
            'array' => PropertyType::ARRAY,
            'object' => PropertyType::OBJECT,
            default => PropertyType::STRING,
        };
    }
}

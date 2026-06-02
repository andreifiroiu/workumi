<?php

declare(strict_types=1);

namespace App\Services;

use App\Contracts\Tools\ToolInterface;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\File;
use RuntimeException;

/**
 * Registry for agent tools.
 *
 * Manages registration, discovery, and retrieval of tools that implement
 * the ToolInterface contract. Tools can be registered programmatically
 * or loaded from JSON configuration files.
 */
class ToolRegistry
{
    /**
     * @var array<string, ToolInterface>
     */
    private array $tools = [];

    /**
     * @var array<string, array<string, mixed>>
     */
    private array $toolDefinitions = [];

    /**
     * Register a tool instance.
     */
    public function register(ToolInterface $tool): void
    {
        $this->tools[$tool->name()] = $tool;
    }

    /**
     * Get a tool by name.
     */
    public function get(string $name): ?ToolInterface
    {
        return $this->tools[$name] ?? null;
    }

    /**
     * Check if a tool is registered.
     */
    public function has(string $name): bool
    {
        return isset($this->tools[$name]);
    }

    /**
     * Get all registered tools.
     *
     * @return Collection<string, ToolInterface>
     */
    public function all(): Collection
    {
        return collect($this->tools);
    }

    /**
     * Get tools by category.
     *
     * @return Collection<string, ToolInterface>
     */
    public function getByCategory(string $category): Collection
    {
        return $this->all()->filter(
            fn (ToolInterface $tool) => $tool->category() === $category
        );
    }

    /**
     * Load tool definitions from JSON files in the specified directory.
     *
     * Note: This loads tool definitions/metadata, not the actual tool instances.
     * Tool instances should be registered via register() in a service provider.
     */
    public function loadDefinitionsFromDirectory(string $directory): void
    {
        if (! File::isDirectory($directory)) {
            return;
        }

        $files = File::glob($directory.'/*.json');

        foreach ($files as $file) {
            // Skip the schema file
            if (basename($file) === 'schema.json') {
                continue;
            }

            $this->loadDefinitionFromFile($file);
        }
    }

    /**
     * Load a tool definition from a JSON file.
     *
     * @return array<string, mixed>|null The loaded definition or null on failure
     */
    public function loadDefinitionFromFile(string $filePath): ?array
    {
        if (! File::exists($filePath)) {
            return null;
        }

        $content = File::get($filePath);
        $definition = json_decode($content, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new RuntimeException(
                "Failed to parse tool definition from {$filePath}: ".json_last_error_msg()
            );
        }

        if (! isset($definition['name'])) {
            throw new RuntimeException(
                "Tool definition in {$filePath} is missing required 'name' field"
            );
        }

        $this->toolDefinitions[$definition['name']] = $definition;

        return $definition;
    }

    /**
     * Get a tool definition by name.
     *
     * @return array<string, mixed>|null
     */
    public function getDefinition(string $name): ?array
    {
        return $this->toolDefinitions[$name] ?? null;
    }

    /**
     * Get all loaded tool definitions.
     *
     * @return Collection<string, array<string, mixed>>
     */
    public function allDefinitions(): Collection
    {
        return collect($this->toolDefinitions);
    }

    /**
     * Get the required permissions for a tool.
     *
     * @return array<string>
     */
    public function getRequiredPermissions(string $toolName): array
    {
        $definition = $this->getDefinition($toolName);

        if ($definition !== null && isset($definition['required_permissions'])) {
            return $definition['required_permissions'];
        }

        // If no definition found, derive from tool category
        $tool = $this->get($toolName);

        if ($tool === null) {
            return [];
        }

        return $this->getCategoryPermissions($tool->category());
    }

    /**
     * Get the default permissions required for a category.
     *
     * @return array<string>
     */
    private function getCategoryPermissions(string $category): array
    {
        return match ($category) {
            'tasks' => ['can_modify_tasks'],
            'work_orders' => ['can_create_work_orders'],
            'projects' => ['can_create_work_orders'],
            'client_data' => ['can_access_client_data'],
            'email' => ['can_send_emails'],
            'deliverables' => ['can_modify_deliverables'],
            'financial' => ['can_access_financial_data'],
            'playbooks' => ['can_modify_playbooks'],
            default => [],
        };
    }

    /**
     * Unregister a tool (primarily for testing).
     */
    public function unregister(string $name): void
    {
        unset($this->tools[$name]);
    }

    /**
     * Clear all registered tools (primarily for testing).
     */
    public function clear(): void
    {
        $this->tools = [];
        $this->toolDefinitions = [];
    }

    /**
     * Get the count of registered tools.
     */
    public function count(): int
    {
        return count($this->tools);
    }
}

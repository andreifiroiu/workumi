<?php

declare(strict_types=1);

namespace App\Providers;

use App\Agents\Tools\CreateDeliverableTool;
use App\Agents\Tools\CreateDraftWorkOrderTool;
use App\Agents\Tools\CreateNoteTool;
use App\Agents\Tools\CreateProjectTool;
use App\Agents\Tools\CreateTaskTool;
use App\Agents\Tools\GetDocumentsTool;
use App\Agents\Tools\GetPlaybooksTool;
use App\Agents\Tools\GetProjectInsightsTool;
use App\Agents\Tools\GetTeamCapacityTool;
use App\Agents\Tools\GetTeamSkillsTool;
use App\Agents\Tools\TaskListTool;
use App\Agents\Tools\WorkOrderInfoTool;
use App\Services\AgentApprovalService;
use App\Services\AgentBudgetService;
use App\Services\AgentMemoryService;
use App\Services\AgentOrchestrator;
use App\Services\AgentPermissionService;
use App\Services\AgentRunner;
use App\Services\ContextBuilder;
use App\Services\ToolGateway;
use App\Services\ToolRegistry;
use Illuminate\Support\ServiceProvider;

class AgentServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Register ToolRegistry as a singleton
        $this->app->singleton(ToolRegistry::class, function () {
            $registry = new ToolRegistry;

            // Load tool definitions from JSON files
            $toolsDirectory = config_path('agent-tools');
            $registry->loadDefinitionsFromDirectory($toolsDirectory);

            return $registry;
        });

        // Register AgentPermissionService as a singleton
        $this->app->singleton(AgentPermissionService::class, function () {
            return new AgentPermissionService;
        });

        // Register AgentBudgetService as a singleton
        $this->app->singleton(AgentBudgetService::class, function () {
            return new AgentBudgetService;
        });

        // Register ToolGateway as a singleton with permission and budget services
        $this->app->singleton(ToolGateway::class, function ($app) {
            return new ToolGateway(
                $app->make(ToolRegistry::class),
                $app->make(AgentPermissionService::class),
                $app->make(AgentBudgetService::class),
            );
        });

        // Register AgentMemoryService as a singleton
        $this->app->singleton(AgentMemoryService::class, function () {
            return new AgentMemoryService;
        });

        // Register ContextBuilder as a singleton
        $this->app->singleton(ContextBuilder::class, function ($app) {
            return new ContextBuilder(
                $app->make(AgentMemoryService::class),
            );
        });

        // Register AgentRunner as a singleton
        $this->app->singleton(AgentRunner::class, function ($app) {
            return new AgentRunner(
                $app->make(ToolGateway::class),
                $app->make(AgentBudgetService::class),
                $app->make(ContextBuilder::class),
            );
        });

        // Register AgentOrchestrator as a singleton
        $this->app->singleton(AgentOrchestrator::class, function () {
            return new AgentOrchestrator;
        });

        // Register AgentApprovalService as a singleton
        $this->app->singleton(AgentApprovalService::class, function ($app) {
            return new AgentApprovalService(
                $app->make(AgentOrchestrator::class),
            );
        });

        // Tag sample tools for auto-registration
        $this->app->tag([
            TaskListTool::class,
            WorkOrderInfoTool::class,
            CreateNoteTool::class,
            // Dispatcher Agent tools
            GetTeamSkillsTool::class,
            GetTeamCapacityTool::class,
            CreateDraftWorkOrderTool::class,
            CreateProjectTool::class,
            GetPlaybooksTool::class,
            GetDocumentsTool::class,
            // PM Copilot Agent tools
            CreateDeliverableTool::class,
            CreateTaskTool::class,
            GetProjectInsightsTool::class,
        ], 'agent.tool');
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Register any tools tagged in the service container
        $this->registerTaggedTools();

        // Register built-in sample tools
        $this->registerBuiltInTools();
    }

    /**
     * Register tools that have been tagged in the service container.
     */
    private function registerTaggedTools(): void
    {
        $registry = $this->app->make(ToolRegistry::class);

        // Auto-discover and register tools tagged with 'agent.tool'
        foreach ($this->app->tagged('agent.tool') as $tool) {
            $registry->register($tool);
        }
    }

    /**
     * Register built-in sample tools directly.
     */
    private function registerBuiltInTools(): void
    {
        $registry = $this->app->make(ToolRegistry::class);

        // Register sample tools if not already registered via tags
        $builtInTools = [
            TaskListTool::class,
            WorkOrderInfoTool::class,
            CreateNoteTool::class,
            // Dispatcher Agent tools
            GetTeamSkillsTool::class,
            GetTeamCapacityTool::class,
            CreateDraftWorkOrderTool::class,
            CreateProjectTool::class,
            GetPlaybooksTool::class,
            GetDocumentsTool::class,
            // PM Copilot Agent tools
            CreateDeliverableTool::class,
            CreateTaskTool::class,
            GetProjectInsightsTool::class,
        ];

        foreach ($builtInTools as $toolClass) {
            $tool = $this->app->make($toolClass);
            if (! $registry->has($tool->name())) {
                $registry->register($tool);
            }
        }
    }
}

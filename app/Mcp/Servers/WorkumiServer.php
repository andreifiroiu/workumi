<?php

declare(strict_types=1);

namespace App\Mcp\Servers;

use App\Mcp\Tools\Parties\ListPartiesTool;
use App\Mcp\Tools\Projects\CreateProjectTool;
use App\Mcp\Tools\Projects\GetProjectTool;
use App\Mcp\Tools\Projects\ListProjectsTool;
use App\Mcp\Tools\Projects\UpdateProjectTool;
use App\Mcp\Tools\Tasks\CreateTaskTool;
use App\Mcp\Tools\Tasks\GetTaskTool;
use App\Mcp\Tools\Tasks\ListTasksTool;
use App\Mcp\Tools\Tasks\UpdateTaskTool;
use App\Mcp\Tools\WorkOrders\CreateWorkOrderTool;
use App\Mcp\Tools\WorkOrders\GetWorkOrderTool;
use App\Mcp\Tools\WorkOrders\ListWorkOrdersTool;
use App\Mcp\Tools\WorkOrders\UpdateWorkOrderTool;
use Laravel\Mcp\Server;
use Laravel\Mcp\Server\Attributes\Instructions;
use Laravel\Mcp\Server\Attributes\Name;
use Laravel\Mcp\Server\Attributes\Version;

#[Name('Workumi Project Management')]
#[Version('1.0.0')]
#[Instructions(<<<'MARKDOWN'
    This server provides tools to read and manage projects, work orders, tasks,
    and parties within a single team context. All operations are scoped to the
    team specified when the server was started.

    Projects contain work orders, which contain tasks. Use list tools to discover
    IDs, then use get tools to fetch full details. Create and update tools accept
    only the fields you want to set.

    Statuses:
    - Projects: active, on_hold, completed, archived
    - Work Orders: draft, active, in_review, approved, delivered, blocked, cancelled, revision_requested, archived
    - Tasks: todo, in_progress, in_review, approved, done, blocked, cancelled, revision_requested, archived
    MARKDOWN)]
class WorkumiServer extends Server
{
    protected array $tools = [
        ListProjectsTool::class,
        GetProjectTool::class,
        CreateProjectTool::class,
        UpdateProjectTool::class,
        ListWorkOrdersTool::class,
        GetWorkOrderTool::class,
        CreateWorkOrderTool::class,
        UpdateWorkOrderTool::class,
        ListTasksTool::class,
        GetTaskTool::class,
        CreateTaskTool::class,
        UpdateTaskTool::class,
        ListPartiesTool::class,
    ];
}

<?php

declare(strict_types=1);

namespace App\Mcp\Servers;

use App\Mcp\Tools\Deliverables\CreateDeliverableTool;
use App\Mcp\Tools\Deliverables\GetDeliverableTool;
use App\Mcp\Tools\Deliverables\ListDeliverablesTool;
use App\Mcp\Tools\Deliverables\UpdateDeliverableTool;
use App\Mcp\Tools\GetContextTool;
use App\Mcp\Tools\Parties\ListPartiesTool;
use App\Mcp\Tools\Projects\CreateProjectTool;
use App\Mcp\Tools\Projects\GetProjectTool;
use App\Mcp\Tools\Projects\ListProjectsTool;
use App\Mcp\Tools\Projects\UpdateProjectTool;
use App\Mcp\Tools\Tasks\CreateTaskTool;
use App\Mcp\Tools\Tasks\GetTaskTool;
use App\Mcp\Tools\Tasks\ListTasksTool;
use App\Mcp\Tools\Tasks\UpdateTaskTool;
use App\Mcp\Tools\Teams\ListTeamMembersTool;
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
    deliverables, and parties within a single team context. All operations are
    scoped to the team specified when the server was started.

    Start with get_context to learn the team name and your user ID.
    Use list_team_members to look up user IDs before assigning work.

    Hierarchy: Projects → Work Orders → Tasks / Deliverables

    Statuses:
    - Projects: active, on_hold, completed, archived
    - Work Orders: draft, active, in_review, approved, delivered, blocked, cancelled, revision_requested, archived
    - Tasks: todo, in_progress, in_review, approved, done, blocked, cancelled, revision_requested, archived
    - Deliverables: draft, in_review, approved, delivered

    Deliverable types: document, design, report, code, other

    List tools return { data, limit, offset } — compare count(data) to limit to detect more pages.
    MARKDOWN)]
class WorkumiServer extends Server
{
    protected array $tools = [
        GetContextTool::class,
        ListTeamMembersTool::class,
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
        ListDeliverablesTool::class,
        GetDeliverableTool::class,
        CreateDeliverableTool::class,
        UpdateDeliverableTool::class,
        ListPartiesTool::class,
    ];
}

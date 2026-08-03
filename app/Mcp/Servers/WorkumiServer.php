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
use App\Mcp\Tools\Teams\ListTeamsTool;
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
    deliverables, and parties. Your access token belongs to a user, not a team,
    so every team you are a member of is reachable in one session.

    Start with get_context to learn your user ID and which teams you can reach.

    Choosing a team:
    - List tools span all your teams by default; pass team_id to narrow to one.
      Every record they return carries team_id and a team object.
    - Tools that take a record ID (get_*, update_*) find the record in any of
      your teams — you never need to name the team.
    - create_project takes a team_id. You may omit it when you belong to exactly
      one team; otherwise the call fails and tells you which teams to choose from.
    - create_work_order, create_task and create_deliverable inherit the team from
      their parent project or work order, so they never take a team_id.

    Use list_teams to see your teams and list_team_members to look up user IDs
    before assigning work. Assignees must belong to the record's own team.

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
        ListTeamsTool::class,
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

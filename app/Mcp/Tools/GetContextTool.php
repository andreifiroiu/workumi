<?php

declare(strict_types=1);

namespace App\Mcp\Tools;

use App\Models\Team;
use App\Support\TeamAccess;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Tool;

#[Description('Returns the authenticated user and every team this token can reach. Use this first to discover your own user ID and which teams are available. The default team is the one used by create tools when you do not pass a team_id. In stdio/CLI mode the user field will be null.')]
class GetContextTool extends Tool
{
    public function handle(Request $request, TeamAccess $access): Response
    {
        $user = $request->user();

        $teams = Team::query()
            ->whereIn('id', $access->teamIds)
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn (Team $team): array => [
                'id' => $team->id,
                'name' => $team->name,
                'is_default' => $team->id === $access->defaultTeamId,
            ]);

        return Response::json([
            'user' => $user ? [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
            ] : null,
            'default_team_id' => $access->defaultTeamId,
            'teams' => $teams->all(),
        ]);
    }

    public function schema(JsonSchema $schema): array
    {
        return [];
    }
}

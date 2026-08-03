<?php

declare(strict_types=1);

namespace App\Mcp\Tools\Teams;

use App\Models\Team;
use App\Support\TeamAccess;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Tool;

#[Description('List every team this token can reach, with your role in each. Use the returned team IDs to filter list tools or to choose where create_project puts a new project.')]
class ListTeamsTool extends Tool
{
    public function handle(Request $request, TeamAccess $access): Response
    {
        $user = $request->user();

        $teams = Team::query()
            ->with('users')
            ->whereIn('id', $access->teamIds)
            ->orderBy('name')
            ->get()
            ->map(fn (Team $team): array => [
                'id' => $team->id,
                'name' => $team->name,
                'role' => $this->roleFor($team, $user?->id),
                'is_default' => $team->id === $access->defaultTeamId,
            ]);

        return Response::json(['data' => $teams->all()]);
    }

    public function schema(JsonSchema $schema): array
    {
        return [];
    }

    private function roleFor(Team $team, ?int $userId): ?string
    {
        if ($userId === null) {
            return null;
        }

        if ($team->user_id === $userId) {
            return 'owner';
        }

        return $team->users->firstWhere('id', $userId)?->membership?->role?->code ?? 'member';
    }
}

<?php

declare(strict_types=1);

namespace App\Mcp\Tools;

use App\Mcp\TeamContext;
use App\Models\Team;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Tool;

#[Description('Returns the current team context and authenticated user. Use this to discover the team name and your own user ID before making other calls. In stdio/CLI mode the user field will be null.')]
class GetContextTool extends Tool
{
    public function handle(Request $request, TeamContext $context): Response
    {
        $team = Team::find($context->teamId);
        $user = $request->user();

        return Response::json([
            'team' => $team ? [
                'id' => $team->id,
                'name' => $team->name,
            ] : ['id' => $context->teamId, 'name' => null],
            'user' => $user ? [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
            ] : null,
        ]);
    }

    public function schema(JsonSchema $schema): array
    {
        return [];
    }
}

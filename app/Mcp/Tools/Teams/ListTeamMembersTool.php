<?php

declare(strict_types=1);

namespace App\Mcp\Tools\Teams;

use App\Mcp\TeamContext;
use App\Models\Team;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Tool;

#[Description('List all members of the current team, including the owner. Returns id, name, email, and role. Use the returned user IDs when assigning tasks or work orders.')]
class ListTeamMembersTool extends Tool
{
    public function handle(Request $request, TeamContext $context): Response
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
        ]);

        $team = Team::with(['users', 'owner'])->findOrFail($context->teamId);

        $members = $team->allUsers()->map(function ($user) use ($team) {
            $role = $user->id === $team->user_id
                ? 'owner'
                : ($user->membership?->role?->code ?? 'member');

            return [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $role,
            ];
        });

        if (isset($validated['search'])) {
            $search = mb_strtolower($validated['search']);
            $members = $members->filter(fn ($m) => str_contains(mb_strtolower($m['name']), $search) ||
                str_contains(mb_strtolower($m['email']), $search)
            );
        }

        return Response::json($members->values()->toArray());
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'search' => $schema->string()->nullable()->description('Filter by name or email (case-insensitive)'),
        ];
    }
}

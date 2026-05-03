<?php

declare(strict_types=1);

namespace App\Mcp\Tools\Parties;

use App\Mcp\TeamContext;
use App\Models\Party;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\Validation\Rule;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Tool;

#[Description('List parties (clients, vendors, partners, departments) for the team. Optionally filter by type.')]
class ListPartiesTool extends Tool
{
    public function handle(Request $request, TeamContext $context): Response
    {
        $validated = $request->validate([
            'type' => ['nullable', 'string', Rule::in(['client', 'vendor', 'partner', 'department', 'internal-department', 'team_member'])],
            'status' => ['nullable', 'string'],
        ]);

        $query = Party::forTeam($context->teamId)
            ->orderBy('name');

        if (isset($validated['type'])) {
            $query->ofType($validated['type']);
        }

        if (isset($validated['status'])) {
            $query->where('status', $validated['status']);
        }

        $parties = $query->get([
            'id', 'name', 'type', 'status', 'contact_name',
            'contact_email', 'phone', 'website', 'tags',
        ]);

        return Response::json($parties->toArray());
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'type' => $schema->string()->enum(['client', 'vendor', 'partner', 'department', 'internal-department', 'team_member'])->nullable()->description('Filter by party type'),
            'status' => $schema->string()->nullable()->description('Filter by status (e.g. active)'),
        ];
    }
}

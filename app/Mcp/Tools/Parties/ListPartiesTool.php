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
            'limit' => ['nullable', 'integer', 'min:1', 'max:200'],
            'offset' => ['nullable', 'integer', 'min:0'],
        ]);

        $query = Party::forTeam($context->teamId)
            ->orderBy('name');

        if (isset($validated['type'])) {
            $query->ofType($validated['type']);
        }

        if (isset($validated['status'])) {
            $query->where('status', $validated['status']);
        }

        $limit = $validated['limit'] ?? 50;
        $offset = $validated['offset'] ?? 0;

        $parties = $query->offset($offset)->limit($limit)->get([
            'id', 'name', 'type', 'status', 'contact_name',
            'contact_email', 'phone', 'website', 'tags',
        ]);

        return Response::json(['data' => $parties->toArray(), 'limit' => $limit, 'offset' => $offset]);
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'type' => $schema->string()->enum(['client', 'vendor', 'partner', 'department', 'internal-department', 'team_member'])->nullable()->description('Filter by party type'),
            'status' => $schema->string()->nullable()->description('Filter by status (e.g. active)'),
            'limit' => $schema->integer()->nullable()->description('Max records to return (default 50, max 200)'),
            'offset' => $schema->integer()->nullable()->description('Number of records to skip (default 0)'),
        ];
    }
}

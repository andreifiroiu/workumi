<?php

declare(strict_types=1);

namespace App\Mcp\Tools\Parties;

use App\Enums\PartyType;
use App\Models\Party;
use App\Support\TeamAccess;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\Validation\Rule;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Tool;

#[Description('List parties (clients, vendors, partners, departments) across every team you belong to, or pass team_id to narrow to one. Optionally filter by type.')]
class ListPartiesTool extends Tool
{
    public function handle(Request $request, TeamAccess $access): Response
    {
        $validated = $request->validate([
            'team_id' => ['nullable', 'integer'],
            'type' => ['nullable', 'string', Rule::in(array_column(PartyType::cases(), 'value'))],
            'status' => ['nullable', 'string'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:200'],
            'offset' => ['nullable', 'integer', 'min:0'],
        ]);

        $query = Party::forTeams($access->filter(isset($validated['team_id']) ? (int) $validated['team_id'] : null))
            ->with(['team' => fn ($q) => $q->select('id', 'name')->without(['roles', 'groups'])])
            ->orderBy('name');

        if (isset($validated['type'])) {
            $query->ofType(PartyType::from($validated['type']));
        }

        if (isset($validated['status'])) {
            $query->where('status', $validated['status']);
        }

        $limit = $validated['limit'] ?? 50;
        $offset = $validated['offset'] ?? 0;

        $parties = $query->offset($offset)->limit($limit)->get([
            'id', 'team_id', 'name', 'type', 'status', 'contact_name',
            'contact_email', 'phone', 'website', 'tags',
        ]);

        return Response::json(['data' => $parties->toArray(), 'limit' => $limit, 'offset' => $offset]);
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'team_id' => $schema->integer()->nullable()->description('Limit to one team (default: all teams you belong to)'),
            'type' => $schema->string()->enum(array_column(PartyType::cases(), 'value'))->nullable()->description('Filter by party type'),
            'status' => $schema->string()->nullable()->description('Filter by status (e.g. active)'),
            'limit' => $schema->integer()->nullable()->description('Max records to return (default 50, max 200)'),
            'offset' => $schema->integer()->nullable()->description('Number of records to skip (default 0)'),
        ];
    }
}

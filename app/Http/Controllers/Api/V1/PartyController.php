<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Enums\PartyType;
use App\Http\Controllers\Controller;
use App\Http\Resources\Api\V1\PartyResource;
use App\Models\Party;
use App\Support\TeamAccess;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class PartyController extends Controller
{
    /**
     * Parties across every team this token can reach, or one team via team_id.
     */
    public function index(Request $request, TeamAccess $access): AnonymousResourceCollection
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

        $limit = (int) ($validated['limit'] ?? 50);
        $offset = (int) ($validated['offset'] ?? 0);

        return PartyResource::collection($query->offset($offset)->limit($limit)->get())
            ->additional(['meta' => ['limit' => $limit, 'offset' => $offset]]);
    }

    public function show(TeamAccess $access, int $party): PartyResource
    {
        return new PartyResource(
            Party::forTeams($access->teamIds)->with(['team' => fn ($q) => $q->select('id', 'name')->without(['roles', 'groups'])])->findOrFail($party)
        );
    }
}

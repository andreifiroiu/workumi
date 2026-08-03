<?php

namespace App\Http\Controllers\Work;

use App\Enums\PartyType;
use App\Http\Controllers\Controller;
use App\Models\Party;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class PartyController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $team = $user->currentTeam;

        $parties = Party::forTeam($team->id)
            ->orderBy('name')
            ->get()
            ->map(fn (Party $party) => [
                'id' => (string) $party->id,
                'name' => $party->name,
                'type' => $party->type->value,
                'contactName' => $party->contact_name,
                'contactEmail' => $party->contact_email,
            ]);

        return response()->json($parties);
    }

    public function store(Request $request): RedirectResponse
    {
        $this->authorize('create', Party::class);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'required|string|in:client,vendor,department,team_member',
            'contactName' => 'nullable|string|max:255',
            'contactEmail' => 'nullable|email|max:255',
        ]);

        $user = $request->user();
        $team = $user->currentTeam;

        Party::create([
            'team_id' => $team->id,
            'name' => $validated['name'],
            'type' => PartyType::from($validated['type']),
            'contact_name' => $validated['contactName'] ?? null,
            'contact_email' => $validated['contactEmail'] ?? null,
        ]);

        return back();
    }

    public function update(Request $request, Party $party): RedirectResponse
    {
        $this->authorize('update', $party);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'type' => 'sometimes|required|string|in:client,vendor,department,team_member',
            'contactName' => 'nullable|string|max:255',
            'contactEmail' => 'nullable|email|max:255',
        ]);

        $updateData = [];
        if (isset($validated['name'])) {
            $updateData['name'] = $validated['name'];
        }
        if (isset($validated['type'])) {
            $updateData['type'] = PartyType::from($validated['type']);
        }
        if (array_key_exists('contactName', $validated)) {
            $updateData['contact_name'] = $validated['contactName'];
        }
        if (array_key_exists('contactEmail', $validated)) {
            $updateData['contact_email'] = $validated['contactEmail'];
        }

        $party->update($updateData);

        return back();
    }

    public function destroy(Request $request, Party $party): RedirectResponse
    {
        $this->authorize('delete', $party);

        // Check if party has any projects
        if ($party->projects()->exists()) {
            return back()->withErrors(['party' => 'Cannot delete party with existing projects.']);
        }

        $party->delete();

        return back();
    }
}

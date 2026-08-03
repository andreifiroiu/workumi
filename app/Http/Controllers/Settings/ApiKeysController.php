<?php

declare(strict_types=1);

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\TeamApiKey;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ApiKeysController extends Controller
{
    public function store(Request $request)
    {
        $user = $request->user();
        $team = $user->currentTeam;
        $providerCodes = array_keys(config('ai-providers.providers', []));

        $validated = $request->validate([
            'provider' => ['required', 'string', Rule::in($providerCodes)],
            'api_key' => ['required', 'string', 'min:10'],
            'scope' => ['required', 'string', Rule::in(['user', 'team'])],
            'label' => ['nullable', 'string', 'max:255'],
        ]);

        // The route is already restricted to team administrators. Re-checking
        // here keeps the rule with the action: a team-scoped key acts on behalf
        // of the whole workspace, a personal key only on behalf of its owner.
        if ($validated['scope'] === 'team') {
            $this->authorize('administer', $team);
        } else {
            abort_unless($user->canWriteTeamContent($team), 403);
        }

        $userId = $validated['scope'] === 'user' ? $user->id : null;

        // Check for duplicate
        $exists = TeamApiKey::where('team_id', $team->id)
            ->where('user_id', $userId)
            ->where('provider', $validated['provider'])
            ->exists();

        if ($exists) {
            $scopeLabel = $validated['scope'] === 'user' ? 'personal' : 'team';

            return back()->withErrors([
                'provider' => "A {$scopeLabel} key for this provider already exists. Remove it first to add a new one.",
            ]);
        }

        TeamApiKey::create([
            'team_id' => $team->id,
            'user_id' => $userId,
            'provider' => $validated['provider'],
            'api_key_encrypted' => $validated['api_key'],
            'key_last_four' => substr($validated['api_key'], -4),
            'label' => $validated['label'],
        ]);

        return back()->with('success', 'API key added successfully.');
    }

    public function destroy(Request $request, TeamApiKey $apiKey)
    {
        $user = $request->user();
        $team = $user->currentTeam;

        // Key must belong to the user's current team
        if ($apiKey->team_id !== $team->id) {
            abort(403);
        }

        // Deleting a team-scoped key affects the whole workspace.
        if ($apiKey->user_id === null) {
            $this->authorize('administer', $team);
        }

        // User-level keys can only be deleted by the owner
        if ($apiKey->user_id !== null && $apiKey->user_id !== $user->id) {
            abort(403);
        }

        $apiKey->delete();

        return back()->with('success', 'API key removed successfully.');
    }
}

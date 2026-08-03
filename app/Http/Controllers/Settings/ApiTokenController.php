<?php

declare(strict_types=1);

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\PersonalAccessToken;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ApiTokenController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        $tokens = $user->tokens()
            ->latest()
            ->get()
            ->map(fn (PersonalAccessToken $token) => [
                'id' => $token->id,
                'name' => $token->name,
                'abilities' => $token->abilities,
                'teamIds' => $token->team_ids,
                'lastUsedAt' => $token->last_used_at?->toISOString(),
                'createdAt' => $token->created_at->toISOString(),
            ]);

        return Inertia::render('account/api-tokens', [
            'tokens' => $tokens,
            'availableTeams' => $user->allTeams()->map(fn ($team) => [
                'id' => $team->id,
                'name' => $team->name,
            ])->values(),
            'newToken' => session('newToken'),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'access' => ['nullable', 'string', Rule::in(['full', 'read'])],
            'team_ids' => ['nullable', 'array'],
            'team_ids.*' => ['integer', Rule::in($user->allTeams()->pluck('id')->all())],
        ]);

        $abilities = ($validated['access'] ?? 'full') === 'read' ? ['read'] : ['*'];

        $token = $user->createToken($validated['name'], $abilities);

        $teamIds = array_values(array_map('intval', $validated['team_ids'] ?? []));

        if ($teamIds !== []) {
            $token->accessToken->forceFill(['team_ids' => $teamIds])->save();
        }

        return to_route('account.api-tokens.index')
            ->with('newToken', $token->plainTextToken);
    }

    public function destroy(Request $request, PersonalAccessToken $token): RedirectResponse
    {
        if ((int) $token->tokenable_id !== $request->user()->id) {
            abort(403);
        }

        $token->delete();

        return back();
    }
}

<?php

declare(strict_types=1);

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Laravel\Sanctum\PersonalAccessToken;

class ApiTokenController extends Controller
{
    public function index(Request $request): Response
    {
        $tokens = $request->user()
            ->tokens()
            ->latest()
            ->get()
            ->map(fn (PersonalAccessToken $token) => [
                'id' => $token->id,
                'name' => $token->name,
                'lastUsedAt' => $token->last_used_at?->toISOString(),
                'createdAt' => $token->created_at->toISOString(),
            ]);

        return Inertia::render('account/api-tokens', [
            'tokens' => $tokens,
            'newToken' => session('newToken'),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);

        $token = $request->user()->createToken($validated['name']);

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

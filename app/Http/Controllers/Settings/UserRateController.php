<?php

declare(strict_types=1);

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\StoreUserRateRequest;
use App\Models\UserRate;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class UserRateController extends Controller
{
    /**
     * List rates for all team members with full rate history.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $team = $user->currentTeam;

        $this->authorize('administer', $team);

        // Get all team members
        $teamMembers = $team->allUsers();
        $teamMemberIds = $teamMembers->pluck('id')->toArray();

        // Get all rates for team members, grouped by user
        $rates = UserRate::forTeam($team->id)
            ->whereIn('user_id', $teamMemberIds)
            ->with('user')
            ->orderByDesc('effective_date')
            ->get()
            ->groupBy('user_id');

        // Format rates for the frontend with full history
        $formattedRates = $teamMembers->map(function ($member) use ($rates) {
            $memberRates = $rates->get($member->id, collect());
            $currentRate = $memberRates->first();

            // Format individual rate for reuse
            $formatRate = fn ($rate) => [
                'id' => (string) $rate->id,
                'internalRate' => (float) $rate->internal_rate,
                'billingRate' => (float) $rate->billing_rate,
                'effectiveDate' => $rate->effective_date->format('Y-m-d'),
            ];

            return [
                'userId' => (string) $member->id,
                'userName' => $member->name,
                'userEmail' => $member->email,
                'currentRate' => $currentRate ? $formatRate($currentRate) : null,
                'rateHistory' => $memberRates->map($formatRate)->values()->all(),
            ];
        })->values();

        return Inertia::render('account/settings/rates', [
            'rates' => $formattedRates,
            'teamMembers' => $teamMembers->map(fn ($member) => [
                'id' => (string) $member->id,
                'name' => $member->name,
                'email' => $member->email,
            ])->values(),
        ]);
    }

    /**
     * Create a new rate with effective_date.
     */
    public function store(StoreUserRateRequest $request): RedirectResponse
    {
        $user = $request->user();
        $team = $user->currentTeam;

        $this->authorize('administer', $team);

        $validated = $request->validated();

        UserRate::create([
            'team_id' => $team->id,
            'user_id' => $validated['user_id'],
            'internal_rate' => $validated['internal_rate'],
            'billing_rate' => $validated['billing_rate'],
            'effective_date' => $validated['effective_date'],
        ]);

        return back()->with('status', 'Rate created successfully.');
    }
}

<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\Team;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class TeamController extends Controller
{
    /**
     * Display a listing of the user's teams.
     */
    public function index()
    {
        $teams = Auth::user()->allTeams()->map(function ($team) {
            return [
                'id' => $team->id,
                'name' => $team->name,
                'slug' => $team->slug ?? null,
                'user_id' => $team->user_id,
                'created_at' => $team->created_at->toISOString(),
                'updated_at' => $team->updated_at->toISOString(),
                'is_owner' => $team->user_id === Auth::id(),
                'is_current' => $team->id === Auth::user()->current_team_id,
            ];
        });

        return Inertia::render('account/teams/index', [
            'teams' => $teams,
            'currentTeamId' => Auth::user()->current_team_id,
        ]);
    }

    /**
     * Store a newly created team.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);

        $team = Auth::user()->createTeam([
            'name' => $validated['name'],
        ]);

        Auth::user()->switchTeam($team);

        return redirect()->route('account.teams.index')
            ->with('status', 'Team created successfully.');
    }

    /**
     * Update the specified team.
     */
    public function update(Request $request, Team $team)
    {
        $this->authorize('update', $team);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);

        $team->update($validated);

        return back()->with('status', 'Team updated successfully.');
    }

    /**
     * Remove the specified team.
     */
    public function destroy(Team $team)
    {
        $this->authorize('delete', $team);

        if (Auth::user()->allTeams()->count() <= 1) {
            return back()->withErrors([
                'team' => 'You cannot delete your only team.',
            ]);
        }

        if ($team->id === Auth::user()->current_team_id) {
            $newTeam = Auth::user()->allTeams()
                ->where('id', '!=', $team->id)
                ->first();

            if ($newTeam) {
                Auth::user()->switchTeam($newTeam);
            }
        }

        $team->delete();

        return redirect()->route('account.teams.index')
            ->with('status', 'Team deleted successfully.');
    }

    /**
     * Switch the user's current team.
     */
    public function switch(Request $request, Team $team)
    {
        $this->authorize('view', $team);

        Auth::user()->switchTeam($team);

        return redirect()->back();
    }
}

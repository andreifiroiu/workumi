<?php

namespace App\Http\Controllers;

use App\Models\Playbook;
use App\Models\WorkOrder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PlaybooksController extends Controller
{
    public function index(Request $request): Response|RedirectResponse
    {
        $user = $request->user();
        $team = $user->currentTeam;

        if (! $team) {
            return redirect()->route('account.teams.index');
        }

        // Fetch all playbooks for the team
        $playbooks = Playbook::forTeam($team->id)
            ->with(['creator', 'workOrders'])
            ->latest('last_used')
            ->get()
            ->map(function ($playbook) {
                return [
                    'id' => (string) $playbook->id,
                    'type' => $playbook->type->value,
                    'name' => $playbook->name,
                    'description' => $playbook->description,
                    'content' => $playbook->content,
                    'tags' => $playbook->tags ?? [],
                    'timesApplied' => $playbook->times_applied,
                    'lastUsed' => $playbook->last_used?->toISOString(),
                    'createdBy' => (string) $playbook->created_by,
                    'createdByName' => $playbook->created_by_name,
                    'lastModified' => $playbook->updated_at->toISOString(),
                    'aiGenerated' => $playbook->ai_generated,
                    'usedByWorkOrders' => $playbook->workOrders->pluck('id')->map(fn ($id) => (string) $id)->toArray(),
                ];
            });

        // Fetch work orders for context (simplified for reference)
        $workOrders = WorkOrder::forTeam($team->id)
            ->visibleTo($user->id)
            ->with('project')
            ->get()
            ->map(function ($wo) {
                return [
                    'id' => (string) $wo->id,
                    'title' => $wo->title,
                    'projectName' => $wo->project->name ?? 'No Project',
                ];
            });

        return Inertia::render('playbooks/index', [
            'playbooks' => $playbooks,
            'workOrders' => $workOrders,
        ]);
    }
}

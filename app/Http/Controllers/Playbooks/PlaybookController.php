<?php

namespace App\Http\Controllers\Playbooks;

use App\Http\Controllers\Controller;
use App\Models\Playbook;
use Illuminate\Http\Request;

class PlaybookController extends Controller
{
    public function store(Request $request)
    {
        $this->authorize('create', Playbook::class);

        $user = $request->user();
        $team = $user->currentTeam;

        $validated = $request->validate([
            'type' => ['required', 'in:sop,checklist,template,acceptance_criteria'],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['required', 'string'],
            'content' => ['required', 'array'],
            'tags' => ['nullable', 'array'],
            'aiGenerated' => ['boolean'],
        ]);

        $playbook = Playbook::create([
            'team_id' => $team->id,
            'created_by' => $user->id,
            'created_by_name' => $user->name,
            ...$validated,
        ]);

        return redirect()->back();
    }

    public function update(Request $request, Playbook $playbook)
    {
        $this->authorize('update', $playbook);

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'description' => ['sometimes', 'string'],
            'content' => ['sometimes', 'array'],
            'tags' => ['nullable', 'array'],
        ]);

        // Create version history before updating
        $playbook->createVersion($request->user(), 'Manual update');

        $playbook->update($validated);

        return redirect()->back();
    }

    public function destroy(Request $request, Playbook $playbook)
    {
        $this->authorize('delete', $playbook);

        $playbook->delete();

        return redirect()->back();
    }

    public function duplicate(Request $request, Playbook $playbook)
    {
        $this->authorize('view', $playbook);

        $user = $request->user();
        $team = $user->currentTeam;

        $duplicate = Playbook::create([
            'team_id' => $team->id,
            'type' => $playbook->type,
            'name' => $playbook->name.' (Copy)',
            'description' => $playbook->description,
            'content' => $playbook->content,
            'tags' => $playbook->tags,
            'created_by' => $user->id,
            'created_by_name' => $user->name,
            'ai_generated' => false,
        ]);

        return redirect()->back();
    }

    public function attachToWorkOrders(Request $request, Playbook $playbook)
    {
        $this->authorize('view', $playbook);

        $validated = $request->validate([
            'workOrderIds' => ['required', 'array'],
            'workOrderIds.*' => ['exists:work_orders,id'],
        ]);

        foreach ($validated['workOrderIds'] as $workOrderId) {
            $playbook->workOrders()->syncWithoutDetaching([
                $workOrderId => [
                    'attached_by' => $request->user()->id,
                    'attached_at' => now(),
                    'ai_suggested' => false,
                ],
            ]);
        }

        $playbook->incrementUsage();

        return redirect()->back();
    }
}

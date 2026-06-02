<?php

declare(strict_types=1);

namespace App\Http\Controllers\Work;

use App\Enums\ProjectStatus;
use App\Http\Controllers\Controller;
use App\Models\Deliverable;
use App\Models\Project;
use App\Models\Task;
use App\Models\WorkOrder;
use App\Models\WorkOrderList;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class WorkOrderListController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $this->authorize('create', WorkOrderList::class);

        $validated = $request->validate([
            'projectId' => 'required|exists:projects,id',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'color' => 'nullable|string|max:7',
        ]);

        $user = $request->user();
        $team = $user->currentTeam;
        $project = Project::findOrFail($validated['projectId']);

        // Verify project belongs to user's team
        if ($project->team_id !== $team->id) {
            abort(403);
        }

        // Get max position and add new list at the end
        $maxPosition = WorkOrderList::forProject($project->id)->max('position') ?? 0;

        WorkOrderList::create([
            'team_id' => $team->id,
            'project_id' => $project->id,
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'color' => $validated['color'] ?? null,
            'position' => $maxPosition + 100,
        ]);

        return back();
    }

    public function update(Request $request, WorkOrderList $workOrderList): RedirectResponse
    {
        $this->authorize('update', $workOrderList);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'color' => 'nullable|string|max:7',
        ]);

        $updateData = [];
        if (isset($validated['name'])) {
            $updateData['name'] = $validated['name'];
        }
        if (array_key_exists('description', $validated)) {
            $updateData['description'] = $validated['description'];
        }
        if (array_key_exists('color', $validated)) {
            $updateData['color'] = $validated['color'];
        }

        $workOrderList->update($updateData);

        return back();
    }

    public function destroy(Request $request, WorkOrderList $workOrderList): RedirectResponse
    {
        $this->authorize('delete', $workOrderList);

        // Move all work orders in this list to ungrouped
        WorkOrder::where('work_order_list_id', $workOrderList->id)
            ->update([
                'work_order_list_id' => null,
                'position_in_list' => 0,
            ]);

        $workOrderList->delete();

        return back();
    }

    public function convertToProject(Request $request, WorkOrderList $workOrderList): RedirectResponse
    {
        $this->authorize('update', $workOrderList);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'partyId' => 'required|exists:parties,id',
            'startDate' => 'required|date',
            'targetEndDate' => 'nullable|date|after_or_equal:startDate',
        ]);

        $user = $request->user();
        $sourceProject = $workOrderList->project;

        $newProject = DB::transaction(function () use ($workOrderList, $validated, $user): Project {
            $project = Project::create([
                'team_id' => $workOrderList->team_id,
                'party_id' => $validated['partyId'],
                'owner_id' => $user->id,
                'accountable_id' => $user->id,
                'name' => $validated['name'],
                'description' => $workOrderList->description,
                'status' => ProjectStatus::Active,
                'start_date' => $validated['startDate'],
                'target_end_date' => $validated['targetEndDate'] ?? null,
            ]);

            $workOrderIds = WorkOrder::where('work_order_list_id', $workOrderList->id)->pluck('id');

            WorkOrder::whereIn('id', $workOrderIds)
                ->update([
                    'project_id' => $project->id,
                    'work_order_list_id' => null,
                ]);

            // Tasks and deliverables denormalize their work order's project_id,
            // so they must follow the work orders into the new project.
            Task::whereIn('work_order_id', $workOrderIds)->update(['project_id' => $project->id]);
            Deliverable::whereIn('work_order_id', $workOrderIds)->update(['project_id' => $project->id]);

            $workOrderList->delete();

            return $project;
        });

        $sourceProject->refresh()->recalculateProgress();
        $newProject->refresh()->recalculateProgress();

        return redirect()->route('projects.show', $newProject);
    }

    public function moveWorkOrder(Request $request, WorkOrderList $workOrderList): RedirectResponse
    {
        $this->authorize('update', $workOrderList);

        $validated = $request->validate([
            'workOrderId' => 'required|exists:work_orders,id',
            'position' => 'nullable|integer|min:0',
        ]);

        $workOrder = WorkOrder::findOrFail($validated['workOrderId']);

        // Verify work order belongs to same project
        if ($workOrder->project_id !== $workOrderList->project_id) {
            abort(403);
        }

        // Calculate position
        $position = $validated['position'] ?? null;
        if ($position === null) {
            $maxPosition = WorkOrder::where('work_order_list_id', $workOrderList->id)
                ->max('position_in_list') ?? 0;
            $position = $maxPosition + 100;
        }

        $workOrder->update([
            'work_order_list_id' => $workOrderList->id,
            'position_in_list' => $position,
        ]);

        return back();
    }

    public function removeFromList(Request $request, WorkOrder $workOrder): RedirectResponse
    {
        $this->authorize('update', $workOrder);

        $workOrder->update([
            'work_order_list_id' => null,
            'position_in_list' => 0,
        ]);

        return back();
    }

    public function reorder(Request $request, Project $project): RedirectResponse
    {
        $this->authorize('update', $project);

        $validated = $request->validate([
            'listIds' => 'required|array',
            'listIds.*' => 'exists:work_order_lists,id',
        ]);

        foreach ($validated['listIds'] as $index => $listId) {
            WorkOrderList::where('id', $listId)
                ->where('project_id', $project->id)
                ->update(['position' => ($index + 1) * 100]);
        }

        return back();
    }

    public function reorderWorkOrders(Request $request, Project $project): RedirectResponse
    {
        $this->authorize('update', $project);

        $validated = $request->validate([
            'listId' => 'nullable|exists:work_order_lists,id',
            'workOrderIds' => 'required|array',
            'workOrderIds.*' => 'exists:work_orders,id',
        ]);

        $listId = $validated['listId'];

        foreach ($validated['workOrderIds'] as $index => $workOrderId) {
            WorkOrder::where('id', $workOrderId)
                ->where('project_id', $project->id)
                ->update([
                    'work_order_list_id' => $listId,
                    'position_in_list' => ($index + 1) * 100,
                ]);
        }

        return back();
    }
}

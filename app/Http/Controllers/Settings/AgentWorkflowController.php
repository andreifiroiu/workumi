<?php

declare(strict_types=1);

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Resources\AgentWorkflowStateResource;
use App\Models\AgentWorkflowState;
use App\Services\AgentOrchestrator;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AgentWorkflowController extends Controller
{
    public function __construct(
        private readonly AgentOrchestrator $orchestrator,
    ) {}

    /**
     * Get workflow state details.
     */
    public function show(Request $request, AgentWorkflowState $workflowState): Response
    {
        $team = $request->user()->currentTeam;
        $this->authorize('administer', $team);

        // Verify the workflow state belongs to the user's team
        if ($workflowState->team_id !== $team->id) {
            abort(403, 'Workflow state does not belong to your team');
        }

        $workflowState->load(['agent', 'activityLogs']);
        $workflowState->loadCount('activityLogs');

        return Inertia::render('settings/agent-workflows/show', [
            'workflowState' => (new AgentWorkflowStateResource($workflowState))->resolve(),
        ]);
    }

    /**
     * Approve a paused workflow.
     */
    public function approve(Request $request, AgentWorkflowState $workflowState): RedirectResponse
    {
        $team = $request->user()->currentTeam;
        $user = $request->user();
        $this->authorize('administer', $team);

        // Verify the workflow state belongs to the user's team
        if ($workflowState->team_id !== $team->id) {
            abort(403, 'Workflow state does not belong to your team');
        }

        // Verify the workflow is paused and requires approval
        if (! $workflowState->isPaused()) {
            return back()->with('error', 'Workflow is not paused');
        }

        // Resume the workflow with approval data
        $this->orchestrator->resume($workflowState, [
            'approved' => true,
            'approver_id' => $user->id,
            'approver_name' => $user->name,
            'approved_at' => now()->toIso8601String(),
        ]);

        return back()->with('success', 'Workflow approved and resumed');
    }

    /**
     * Reject a paused workflow with a reason.
     */
    public function reject(Request $request, AgentWorkflowState $workflowState): RedirectResponse
    {
        $validated = $request->validate([
            'reason' => 'required|string|max:1000',
        ]);

        $team = $request->user()->currentTeam;
        $user = $request->user();
        $this->authorize('administer', $team);

        // Verify the workflow state belongs to the user's team
        if ($workflowState->team_id !== $team->id) {
            abort(403, 'Workflow state does not belong to your team');
        }

        // Verify the workflow is paused
        if (! $workflowState->isPaused()) {
            return back()->with('error', 'Workflow is not paused');
        }

        // Update the workflow state with rejection data
        $stateData = $workflowState->state_data ?? [];
        $stateData['rejected'] = true;
        $stateData['rejection_reason'] = $validated['reason'];
        $stateData['rejected_by'] = $user->id;
        $stateData['rejected_at'] = now()->toIso8601String();

        $workflowState->update([
            'state_data' => $stateData,
        ]);

        return back()->with('success', 'Workflow rejected');
    }

    /**
     * List workflow states for the current team.
     */
    public function index(Request $request): Response
    {
        $team = $request->user()->currentTeam;
        $this->authorize('administer', $team);

        $query = AgentWorkflowState::query()
            ->forTeam($team->id)
            ->with(['agent'])
            ->orderByDesc('created_at');

        // Apply status filter
        if ($request->filled('status')) {
            match ($request->input('status')) {
                'paused' => $query->paused(),
                'completed' => $query->completed(),
                'running' => $query->running(),
                'requiring_approval' => $query->requiringApproval(),
                default => null,
            };
        }

        // Apply agent filter
        if ($request->filled('agent_id')) {
            $query->where('ai_agent_id', $request->input('agent_id'));
        }

        $workflowStates = $query->paginate(25)->withQueryString();

        return Inertia::render('settings/agent-workflows/index', [
            'workflowStates' => AgentWorkflowStateResource::collection($workflowStates)->response()->getData(true),
            'filters' => [
                'status' => $request->input('status'),
                'agent_id' => $request->input('agent_id'),
            ],
        ]);
    }
}

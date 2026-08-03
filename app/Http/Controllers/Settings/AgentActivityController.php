<?php

declare(strict_types=1);

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Resources\AgentActivityResource;
use App\Models\AgentActivityLog;
use App\Models\AIAgent;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AgentActivityController extends Controller
{
    /**
     * List activity logs for an agent with pagination.
     */
    public function index(Request $request, AIAgent $agent): Response
    {
        $team = $request->user()->currentTeam;
        $this->authorize('administer', $team);

        // AIAgent rows are global; only AgentConfiguration is team-scoped.
        abort_unless(
            $agent->configurations()->where('team_id', $team->id)->exists(),
            404
        );

        $query = AgentActivityLog::query()
            ->forTeam($team->id)
            ->where('ai_agent_id', $agent->id)
            ->with(['agent', 'approver', 'workflowState'])
            ->orderByDesc('created_at');

        // Apply approval status filter
        if ($request->filled('approval_status')) {
            $query->where('approval_status', $request->input('approval_status'));
        }

        // Apply date range filter
        if ($request->filled('date_from') && $request->filled('date_to')) {
            $query->dateRange($request->input('date_from'), $request->input('date_to'));
        } elseif ($request->filled('date_from')) {
            $query->where('created_at', '>=', $request->input('date_from'));
        } elseif ($request->filled('date_to')) {
            $query->where('created_at', '<=', $request->input('date_to'));
        }

        // Apply run type filter
        if ($request->filled('run_type')) {
            $query->where('run_type', $request->input('run_type'));
        }

        $activities = $query->paginate(25)->withQueryString();

        return Inertia::render('settings/agent-activity/index', [
            'agent' => [
                'id' => $agent->id,
                'code' => $agent->code,
                'name' => $agent->name,
            ],
            'activities' => AgentActivityResource::collection($activities)->response()->getData(true),
            'filters' => [
                'approval_status' => $request->input('approval_status'),
                'date_from' => $request->input('date_from'),
                'date_to' => $request->input('date_to'),
                'run_type' => $request->input('run_type'),
            ],
        ]);
    }

    /**
     * Get detailed activity log with tool_calls and context_accessed.
     */
    public function show(Request $request, AgentActivityLog $activity): Response
    {
        $team = $request->user()->currentTeam;
        $this->authorize('administer', $team);

        // Verify the activity belongs to the user's team
        if ($activity->team_id !== $team->id) {
            abort(403, 'Activity log does not belong to your team');
        }

        $activity->load(['agent', 'approver', 'workflowState']);

        return Inertia::render('settings/agent-activity/show', [
            'activity' => (new AgentActivityResource($activity))->resolve(),
        ]);
    }
}

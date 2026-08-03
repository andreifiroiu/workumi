<?php

declare(strict_types=1);

namespace App\Http\Controllers\Settings;

use App\Enums\AgentType;
use App\Http\Controllers\Controller;
use App\Http\Resources\AgentActivityResource;
use App\Models\AgentActivityLog;
use App\Models\AgentConfiguration;
use App\Models\AgentTemplate;
use App\Models\AIAgent;
use App\Models\Team;
use App\Services\AgentRunner;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class AIAgentsController extends Controller
{
    public function __construct(
        private readonly AgentRunner $agentRunner,
    ) {}

    /**
     * Resolve the acting user's current team and assert they may administer it.
     */
    private function authorizeAdministration(Request $request): Team
    {
        $team = $request->user()->currentTeam;

        $this->authorize('administer', $team);

        return $team;
    }

    /**
     * As authorizeAdministration(), but also assert the agent belongs to the team.
     *
     * AIAgent rows are global; only AgentConfiguration is team-scoped. Without
     * this check an unscoped route-model binding exposes every tenant's agents.
     */
    private function authorizeAgentAdministration(Request $request, AIAgent $agent): Team
    {
        $team = $this->authorizeAdministration($request);

        abort_unless(
            $agent->configurations()->where('team_id', $team->id)->exists(),
            404
        );

        return $team;
    }

    /**
     * Toggle an agent's enabled status.
     */
    public function toggleAgent(Request $request, AIAgent $agent): RedirectResponse
    {
        $team = $this->authorizeAgentAdministration($request, $agent);

        $validated = $request->validate([
            'enabled' => 'required|boolean',
        ]);

        $config = AgentConfiguration::firstOrCreate(
            ['team_id' => $team->id, 'ai_agent_id' => $agent->id]
        );

        $config->update(['enabled' => $validated['enabled']]);

        return back()->with('success', $validated['enabled'] ? 'Agent enabled' : 'Agent disabled');
    }

    /**
     * Update an agent's configuration.
     */
    public function updateConfig(Request $request, AIAgent $agent): RedirectResponse
    {
        $team = $this->authorizeAgentAdministration($request, $agent);

        $providerKeys = implode(',', array_keys(config('ai-providers.providers', [])));

        $validated = $request->validate([
            'ai_provider' => "nullable|string|in:{$providerKeys}",
            'ai_model' => 'nullable|string|max:100',
            'daily_run_limit' => 'required|integer|min:1',
            'weekly_run_limit' => 'required|integer|min:1',
            'monthly_budget_cap' => 'required|numeric|min:0',
            'can_create_work_orders' => 'boolean',
            'can_modify_tasks' => 'boolean',
            'can_access_client_data' => 'boolean',
            'can_send_emails' => 'boolean',
            'requires_approval' => 'boolean',
            'verbosity_level' => 'required|in:concise,balanced,detailed',
            'creativity_level' => 'required|in:low,balanced,high',
            'risk_tolerance' => 'required|in:low,medium,high',
        ]);

        $config = AgentConfiguration::where('team_id', $team->id)
            ->where('ai_agent_id', $agent->id)
            ->firstOrFail();

        $config->update($validated);

        return back()->with('success', 'Agent configuration updated');
    }

    /**
     * Create an agent from a template or as a custom agent.
     */
    public function store(Request $request): RedirectResponse
    {
        $team = $this->authorizeAdministration($request);

        $validated = $request->validate([
            'template_id' => 'nullable|exists:agent_templates,id',
            'name' => 'required_without:template_id|nullable|string|max:255',
            'description' => 'nullable|string|max:1000',
            'type' => 'nullable|string',
        ]);

        $template = null;

        if (isset($validated['template_id'])) {
            $template = AgentTemplate::findOrFail($validated['template_id']);

            // Prevent duplicate: check if team already has an agent from this template
            $alreadyExists = AIAgent::where('template_id', $template->id)
                ->whereHas('configurations', fn ($q) => $q->where('team_id', $team->id))
                ->exists();

            if ($alreadyExists) {
                return back()->withErrors(['template_id' => 'An agent from this template has already been added.']);
            }
        }

        $name = $validated['name'] ?? $template?->name ?? 'Unnamed Agent';

        // Generate a unique code for the agent
        $code = Str::slug($name).'-'.$team->id.'-'.Str::random(4);

        // Create the agent
        $agent = AIAgent::create([
            'code' => $code,
            'name' => $name,
            'type' => $template?->type ?? AgentType::tryFrom($validated['type'] ?? 'project-management') ?? AgentType::ProjectManagement,
            'description' => $validated['description'] ?? $template?->description,
            'instructions' => $template?->default_instructions,
            'tools' => $template?->default_tools ?? [],
            'template_id' => $template?->id,
            'is_custom' => $template === null,
        ]);

        // Create the configuration for this team
        $permissions = $template?->default_permissions ?? [];

        AgentConfiguration::create([
            'team_id' => $team->id,
            'ai_agent_id' => $agent->id,
            'ai_provider' => $template?->default_ai_provider,
            'ai_model' => $template?->default_ai_model,
            'enabled' => true,
            'daily_run_limit' => 50,
            'weekly_run_limit' => 200,
            'monthly_budget_cap' => 100.00,
            'can_create_work_orders' => $permissions['can_create_work_orders'] ?? false,
            'can_modify_tasks' => $permissions['can_modify_tasks'] ?? false,
            'can_access_client_data' => $permissions['can_access_client_data'] ?? false,
            'can_send_emails' => $permissions['can_send_emails'] ?? false,
            'can_modify_deliverables' => $permissions['can_modify_deliverables'] ?? false,
            'can_access_financial_data' => $permissions['can_access_financial_data'] ?? false,
            'can_modify_playbooks' => $permissions['can_modify_playbooks'] ?? false,
        ]);

        return back()->with('success', 'Agent created successfully');
    }

    /**
     * Update an agent's basic information.
     */
    public function update(Request $request, AIAgent $agent): RedirectResponse
    {
        $this->authorizeAgentAdministration($request, $agent);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'instructions' => 'nullable|string|max:10000',
        ]);

        // Detach from template if name or instructions were changed
        if ($agent->template_id !== null) {
            $nameChanged = $validated['name'] !== $agent->name;
            $instructionsChanged = array_key_exists('instructions', $validated)
                && $validated['instructions'] !== $agent->instructions;

            if ($nameChanged || $instructionsChanged) {
                $validated['template_id'] = null;
                $validated['is_custom'] = true;
            }
        }

        $agent->update($validated);

        return back()->with('success', 'Agent updated successfully');
    }

    /**
     * Update an agent's configuration including permissions and budget caps.
     */
    public function updateConfiguration(Request $request, AIAgent $agent): RedirectResponse
    {
        $team = $this->authorizeAgentAdministration($request, $agent);

        $providerKeys = implode(',', array_keys(config('ai-providers.providers', [])));

        $validated = $request->validate([
            'ai_provider' => "nullable|string|in:{$providerKeys}",
            'ai_model' => 'nullable|string|max:100',
            'can_create_work_orders' => 'boolean',
            'can_modify_tasks' => 'boolean',
            'can_access_client_data' => 'boolean',
            'can_send_emails' => 'boolean',
            'can_modify_deliverables' => 'boolean',
            'can_access_financial_data' => 'boolean',
            'can_modify_playbooks' => 'boolean',
            'monthly_budget_cap' => 'nullable|numeric|min:0',
            'daily_run_limit' => 'nullable|integer|min:1',
            'weekly_run_limit' => 'nullable|integer|min:1',
            'requires_approval' => 'boolean',
            'tool_permissions' => 'nullable|array',
        ]);

        $config = AgentConfiguration::where('team_id', $team->id)
            ->where('ai_agent_id', $agent->id)
            ->firstOrFail();

        $config->update($validated);

        return back()->with('success', 'Agent configuration updated');
    }

    /**
     * Run an agent with the given input.
     */
    public function run(Request $request, AIAgent $agent): RedirectResponse
    {
        $team = $this->authorizeAgentAdministration($request, $agent);

        $validated = $request->validate([
            'prompt' => 'required|string|max:10000',
            'context_entity_type' => 'nullable|string',
            'context_entity_id' => 'nullable|integer',
        ]);

        $config = AgentConfiguration::where('team_id', $team->id)
            ->where('ai_agent_id', $agent->id)
            ->firstOrFail();

        if (! $config->enabled) {
            return back()->with('error', 'Agent is not enabled');
        }

        // Resolve context entity if provided
        $contextEntity = null;
        if (isset($validated['context_entity_type']) && isset($validated['context_entity_id'])) {
            $entityClass = $validated['context_entity_type'];
            if (class_exists($entityClass)) {
                $contextEntity = $entityClass::find($validated['context_entity_id']);
            }
        }

        // Run the agent
        $activityLog = $this->agentRunner->runWithPrompt(
            $agent,
            $config,
            $validated['prompt'],
            $contextEntity,
        );

        if ($activityLog->error !== null) {
            return back()->with('error', $activityLog->error);
        }

        return back()->with('success', 'Agent run completed');
    }

    /**
     * Approve an agent's output.
     */
    public function approveOutput(Request $request, AgentActivityLog $log): RedirectResponse
    {
        $team = $this->authorizeAdministration($request);

        abort_unless($log->team_id === $team->id, 403);

        $log->update([
            'approval_status' => 'approved',
            'approved_by' => $request->user()->id,
            'approved_at' => now(),
        ]);

        return back()->with('success', 'Agent output approved');
    }

    /**
     * Reject an agent's output.
     */
    public function rejectOutput(Request $request, AgentActivityLog $log): RedirectResponse
    {
        $team = $this->authorizeAdministration($request);

        abort_unless($log->team_id === $team->id, 403);

        $log->update([
            'approval_status' => 'rejected',
            'approved_by' => $request->user()->id,
            'approved_at' => now(),
        ]);

        return back()->with('success', 'Agent output rejected');
    }

    /**
     * Remove an agent from the current team.
     */
    public function destroy(Request $request, AIAgent $agent): RedirectResponse
    {
        $team = $this->authorizeAgentAdministration($request, $agent);

        // Delete the team's configuration for this agent
        AgentConfiguration::where('team_id', $team->id)
            ->where('ai_agent_id', $agent->id)
            ->delete();

        // If no other teams reference this agent, clean up entirely
        if ($agent->configurations()->count() === 0) {
            $agent->activityLogs()->delete();
            $agent->workflowStates()->delete();
            $agent->memories()->delete();
            $agent->delete();
        }

        return back()->with('success', 'Agent removed successfully');
    }

    /**
     * Show activity logs for an agent.
     */
    public function activity(Request $request, AIAgent $agent): Response
    {
        $team = $this->authorizeAgentAdministration($request, $agent);

        $query = AgentActivityLog::query()
            ->forTeam($team->id)
            ->where('ai_agent_id', $agent->id)
            ->with(['agent', 'approver', 'workflowState'])
            ->orderByDesc('created_at');

        // Apply filters
        if ($request->filled('approval_status')) {
            $query->where('approval_status', $request->input('approval_status'));
        }

        if ($request->filled('date_from') && $request->filled('date_to')) {
            $query->dateRange($request->input('date_from'), $request->input('date_to'));
        }

        $activities = $query->paginate(25);

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
            ],
        ]);
    }
}

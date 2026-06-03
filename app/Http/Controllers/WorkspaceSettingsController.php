<?php

namespace App\Http\Controllers;

use App\Models\AgentActivityLog;
use App\Models\AgentTemplate;
use App\Models\AIAgent;
use App\Models\AuditLog;
use App\Models\AvailableIntegration;
use App\Models\BillingInfo;
use App\Models\GlobalAISettings;
use App\Models\Invoice;
use App\Models\TeamApiKey;
use App\Models\TeamIntegration;
use App\Models\WorkspaceSettings;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Inertia\Inertia;

class WorkspaceSettingsController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $team = $user->currentTeam;

        // Get or create workspace settings
        $workspaceSettings = WorkspaceSettings::forTeam($team);

        // Get team members with roles
        $teamMembers = $team->allUsers()->map(function ($member) use ($team) {
            $memberRole = $team->userRole($member);

            return [
                'id' => $member->id,
                'name' => $member->name,
                'email' => $member->email,
                'role' => $memberRole->name ?? 'Owner',
                'roleId' => $memberRole->id ?? null,
                'avatar' => $member->avatar ?? null,
                'joinedAt' => $member->pivot->created_at ?? $member->created_at,
                'lastActiveAt' => $member->updated_at,
                'isOwner' => $member->id === $team->user_id,
            ];
        });

        // Get pending invitations
        $pendingInvitations = $team->invitations()
            ->with('role')
            ->get()
            ->map(fn ($invitation) => [
                'id' => $invitation->id,
                'email' => $invitation->email,
                'role' => $invitation->role?->name ?? 'Member',
                'roleId' => $invitation->role_id,
                'createdAt' => $invitation->created_at->toISOString(),
            ]);

        // Get team roles
        $teamRoles = $team->roles()->get()->map(fn ($role) => [
            'id' => $role->id,
            'code' => $role->code,
            'name' => $role->name,
        ]);

        // Check if current user is team owner
        $isTeamOwner = $user->ownsTeam($team);

        // Get AI agents with configurations (scoped to current team)
        $teamAgents = AIAgent::whereHas('configurations', function ($q) use ($team) {
            $q->where('team_id', $team->id);
        })->with(['configurations' => function ($q) use ($team) {
            $q->where('team_id', $team->id);
        }])->get();

        // Compute which template IDs are already in use by this team
        $usedTemplateIds = $teamAgents->pluck('template_id')->filter()->values()->all();

        $aiAgents = $teamAgents->map(function ($agent) {
            $config = $agent->configurations->first();

            return [
                'id' => $agent->id,
                'code' => $agent->code,
                'name' => $agent->name,
                'type' => $agent->type,
                'description' => $agent->description,
                'instructions' => $agent->instructions,
                'tools' => $agent->tools,
                'templateId' => $agent->template_id,
                'isCustom' => $agent->is_custom,
                'status' => $config?->enabled ? 'enabled' : 'disabled',
                'configuration' => $config ? [
                    'enabled' => $config->enabled,
                    'aiProvider' => $config->ai_provider,
                    'aiModel' => $config->ai_model,
                    'dailyRunLimit' => $config->daily_run_limit,
                    'weeklyRunLimit' => $config->weekly_run_limit,
                    'monthlyBudgetCap' => $config->monthly_budget_cap,
                    'currentMonthSpend' => $config->current_month_spend,
                    'permissions' => [
                        'canCreateWorkOrders' => $config->can_create_work_orders,
                        'canModifyTasks' => $config->can_modify_tasks,
                        'canAccessClientData' => $config->can_access_client_data,
                        'canSendEmails' => $config->can_send_emails,
                        'requiresApproval' => $config->requires_approval,
                    ],
                    'behaviorSettings' => [
                        'verbosityLevel' => $config->verbosity_level,
                        'creativityLevel' => $config->creativity_level,
                        'riskTolerance' => $config->risk_tolerance,
                    ],
                ] : null,
            ];
        });

        // Get global AI settings
        $globalAISettings = GlobalAISettings::forTeam($team);

        // Get recent agent activity
        $agentActivityLogs = AgentActivityLog::where('team_id', $team->id)
            ->with(['agent', 'approver'])
            ->latest()
            ->limit(50)
            ->get()
            ->map(function ($log) {
                return [
                    'id' => $log->id,
                    'agentId' => $log->ai_agent_id,
                    'agentName' => $log->agent->name,
                    'runType' => $log->run_type,
                    'timestamp' => $log->created_at->toISOString(),
                    'input' => $log->input,
                    'output' => $log->output,
                    'tokensUsed' => $log->tokens_used,
                    'cost' => $log->cost,
                    'approvalStatus' => $log->approval_status,
                    'approvedBy' => $log->approved_by,
                    'approvedAt' => $log->approved_at?->toISOString(),
                    'error' => $log->error,
                ];
            });

        // Get audit log entries
        $auditLogEntries = AuditLog::where('team_id', $team->id)
            ->latest('timestamp')
            ->limit(100)
            ->get()
            ->map(fn ($log) => [
                'id' => $log->id,
                'timestamp' => $log->timestamp->toISOString(),
                'actor' => $log->actor,
                'actorName' => $log->actor_name,
                'actorType' => $log->actor_type,
                'action' => $log->action,
                'target' => $log->target,
                'targetId' => $log->target_id,
                'details' => $log->details,
                'ipAddress' => $log->ip_address,
            ]);

        // Get integrations
        $availableIntegrations = AvailableIntegration::where('is_active', true)->get();
        $integrations = $availableIntegrations->map(function ($integration) use ($team) {
            $teamIntegration = TeamIntegration::where('team_id', $team->id)
                ->where('available_integration_id', $integration->id)
                ->first();

            return [
                'id' => $integration->id,
                'code' => $integration->code,
                'name' => $integration->name,
                'category' => $integration->category,
                'description' => $integration->description,
                'icon' => $integration->icon,
                'features' => $integration->features,
                'isActive' => $integration->is_active,
                'connected' => $teamIntegration?->connected ?? false,
                'connectedAt' => $teamIntegration?->connected_at?->toISOString(),
                'lastSyncAt' => $teamIntegration?->last_sync_at?->toISOString(),
                'syncStatus' => $teamIntegration?->sync_status,
                'errorMessage' => $teamIntegration?->error_message,
            ];
        });

        // Get billing information
        $billingInfoModel = BillingInfo::where('team_id', $team->id)->first();
        $billingInfo = $billingInfoModel ? [
            'planName' => $billingInfoModel->plan_name,
            'planPrice' => $billingInfoModel->plan_price,
            'billingCycle' => $billingInfoModel->billing_cycle,
            'billingPeriodStart' => $billingInfoModel->billing_period_start->toISOString(),
            'billingPeriodEnd' => $billingInfoModel->billing_period_end->toISOString(),
            'nextBillingDate' => $billingInfoModel->next_billing_date->toISOString(),
            'usersIncluded' => $billingInfoModel->users_included,
            'usersCurrent' => $billingInfoModel->users_current,
            'projectsIncluded' => $billingInfoModel->projects_included,
            'projectsCurrent' => $billingInfoModel->projects_current,
            'storageGbIncluded' => $billingInfoModel->storage_gb_included,
            'storageGbCurrent' => $billingInfoModel->storage_gb_current,
            'aiRequestsIncluded' => $billingInfoModel->ai_requests_included,
            'aiRequestsCurrent' => $billingInfoModel->ai_requests_current,
            'paymentMethod' => $billingInfoModel->payment_method,
            'cardBrand' => $billingInfoModel->card_brand,
            'cardLast4' => $billingInfoModel->card_last4,
            'cardExpiry' => $billingInfoModel->card_expiry?->toISOString(),
            'status' => $billingInfoModel->status,
            'trialEndsAt' => $billingInfoModel->trial_ends_at?->toISOString(),
        ] : null;

        // Get invoices
        $invoices = Invoice::where('team_id', $team->id)
            ->latest('invoice_date')
            ->limit(12)
            ->get()
            ->map(fn ($invoice) => [
                'id' => $invoice->id,
                'invoiceNumber' => $invoice->invoice_number,
                'invoiceDate' => $invoice->invoice_date->toISOString(),
                'dueDate' => $invoice->due_date->toISOString(),
                'amount' => $invoice->amount,
                'status' => $invoice->status,
                'paidAt' => $invoice->paid_at?->toISOString(),
                'description' => $invoice->description,
                'pdfUrl' => $invoice->pdf_url,
            ]);

        // Get AI providers from config
        $aiProviders = collect(config('ai-providers.providers', []))->map(fn ($p, $code) => [
            'code' => $code,
            'name' => $p['name'],
            'description' => $p['description'],
            'icon' => $p['icon'],
            'docsUrl' => $p['docs_url'],
            'models' => collect($p['models'] ?? [])->map(fn ($label, $id) => [
                'id' => $id,
                'label' => $label,
            ])->values(),
        ])->values();

        // Get API keys visible to this user
        $apiKeys = TeamApiKey::forTeamAndUser($team->id, $user->id)->map(fn ($k) => [
            'id' => $k->id,
            'provider' => $k->provider,
            'keyLastFour' => $k->key_last_four,
            'label' => $k->label,
            'scope' => $k->isTeamLevel() ? 'team' : 'user',
            'lastUsedAt' => $k->last_used_at?->toISOString(),
            'createdAt' => $k->created_at->toISOString(),
        ]);

        // Load agent tool definitions from config
        $agentTools = collect(File::glob(config_path('agent-tools/*.json')))
            ->filter(fn ($file) => basename($file) !== 'schema.json')
            ->map(function ($file) {
                $def = json_decode(File::get($file), true);

                return $def && isset($def['name']) ? [
                    'name' => $def['name'],
                    'description' => $def['description'] ?? '',
                    'category' => $def['category'] ?? 'general',
                    'requiredPermissions' => $def['required_permissions'] ?? [],
                    'enabled' => true,
                    'parameters' => collect($def['parameters'] ?? [])->map(fn ($p) => [
                        'type' => $p['type'] ?? 'string',
                        'description' => $p['description'] ?? '',
                        'required' => $p['required'] ?? false,
                    ])->all(),
                ] : null;
            })
            ->filter()
            ->values();

        return Inertia::render('settings/index', [
            'workspaceSettings' => [
                'name' => $workspaceSettings->name,
                'timezone' => $workspaceSettings->timezone,
                'workWeekStart' => $workspaceSettings->work_week_start,
                'defaultProjectStatus' => $workspaceSettings->default_project_status,
                'brandColor' => $workspaceSettings->brand_color,
                'logo' => $workspaceSettings->logo,
                'workingHoursStart' => $workspaceSettings->working_hours_start,
                'workingHoursEnd' => $workspaceSettings->working_hours_end,
                'dateFormat' => $workspaceSettings->date_format,
                'currency' => $workspaceSettings->currency,
            ],
            'teamMembers' => $teamMembers,
            'pendingInvitations' => $pendingInvitations,
            'teamRoles' => $teamRoles,
            'isTeamOwner' => $isTeamOwner,
            'currentUserId' => $user->id,
            'aiAgents' => $aiAgents,
            'usedTemplateIds' => $usedTemplateIds,
            'agentTemplates' => AgentTemplate::active()->get()->map(fn ($t) => [
                'id' => $t->id,
                'code' => $t->code,
                'name' => $t->name,
                'type' => $t->type->value,
                'description' => $t->description,
                'defaultTools' => $t->default_tools ?? [],
                'defaultPermissions' => $t->default_permissions ?? [],
                'isActive' => $t->is_active,
                'defaultAiProvider' => $t->default_ai_provider,
                'defaultAiModel' => $t->default_ai_model,
            ]),
            'globalAISettings' => [
                'totalMonthlyBudget' => $globalAISettings->total_monthly_budget,
                'currentMonthSpend' => $globalAISettings->current_month_spend,
                'perProjectBudgetCap' => $globalAISettings->per_project_budget_cap,
                'approvalRequirements' => [
                    'clientFacingContent' => $globalAISettings->approval_client_facing_content,
                    'financialData' => $globalAISettings->approval_financial_data,
                    'contractualChanges' => $globalAISettings->approval_contractual_changes,
                    'workOrderCreation' => $globalAISettings->approval_work_order_creation,
                    'taskAssignment' => $globalAISettings->approval_task_assignment,
                ],
            ],
            'agentTools' => $agentTools,
            'agentActivityLogs' => $agentActivityLogs,
            'auditLogEntries' => $auditLogEntries,
            'integrations' => $integrations,
            'billingInfo' => $billingInfo,
            'invoices' => $invoices,
            'aiProviders' => $aiProviders,
            'apiKeys' => $apiKeys,
        ]);
    }

    public function updateWorkspace(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'timezone' => 'required|string',
            'work_week_start' => 'required|in:monday,tuesday,wednesday,thursday,friday,saturday,sunday',
            'brand_color' => 'required|string|regex:/^#[0-9A-Fa-f]{6}$/',
            'working_hours_start' => 'required|date_format:H:i',
            'working_hours_end' => 'required|date_format:H:i',
            'date_format' => 'required|string',
            'currency' => 'required|string|size:3',
        ]);

        $team = $request->user()->currentTeam;
        $settings = WorkspaceSettings::forTeam($team);
        $settings->update($validated);

        return back()->with('success', 'Workspace settings updated successfully.');
    }

    public function updateGlobalAI(Request $request)
    {
        $validated = $request->validate([
            'total_monthly_budget' => 'sometimes|numeric|min:0',
            'per_project_budget_cap' => 'sometimes|numeric|min:0',
            'approval_client_facing_content' => 'sometimes|boolean',
            'approval_financial_data' => 'sometimes|boolean',
            'approval_contractual_changes' => 'sometimes|boolean',
            'approval_work_order_creation' => 'sometimes|boolean',
            'approval_task_assignment' => 'sometimes|boolean',
        ]);

        $team = $request->user()->currentTeam;
        $settings = GlobalAISettings::forTeam($team);
        $settings->update($validated);

        return back()->with('success', 'Global AI settings updated successfully.');
    }
}

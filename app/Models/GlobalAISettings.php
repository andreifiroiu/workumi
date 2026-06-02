<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GlobalAISettings extends Model
{
    protected $table = 'global_ai_settings';

    protected $fillable = [
        'team_id',
        'default_provider',
        'default_model',
        'total_monthly_budget',
        'current_month_spend',
        'per_project_budget_cap',
        'approval_client_facing_content',
        'approval_financial_data',
        'approval_contractual_changes',
        'approval_work_order_creation',
        'approval_task_assignment',
        'retention_days',
        'require_approval_external_sends',
        'require_approval_financial',
        'require_approval_contracts',
        'require_approval_scope_changes',
        'pm_copilot_auto_suggest',
        'pm_copilot_auto_approval_threshold',
        'client_comms_auto_draft',
        'daily_task_digest_enabled',
        'inbound_email_enabled',
    ];

    protected $casts = [
        'total_monthly_budget' => 'decimal:2',
        'current_month_spend' => 'decimal:2',
        'per_project_budget_cap' => 'decimal:2',
        'approval_client_facing_content' => 'boolean',
        'approval_financial_data' => 'boolean',
        'approval_contractual_changes' => 'boolean',
        'approval_work_order_creation' => 'boolean',
        'approval_task_assignment' => 'boolean',
        'retention_days' => 'integer',
        'require_approval_external_sends' => 'boolean',
        'require_approval_financial' => 'boolean',
        'require_approval_contracts' => 'boolean',
        'require_approval_scope_changes' => 'boolean',
        'pm_copilot_auto_suggest' => 'boolean',
        'pm_copilot_auto_approval_threshold' => 'float',
        'client_comms_auto_draft' => 'boolean',
        'daily_task_digest_enabled' => 'boolean',
        'inbound_email_enabled' => 'boolean',
    ];

    /**
     * The model's default attribute values.
     *
     * @var array<string, mixed>
     */
    protected $attributes = [
        'default_provider' => 'anthropic',
        'default_model' => 'claude-sonnet-4-20250514',
        'pm_copilot_auto_suggest' => false,
        'pm_copilot_auto_approval_threshold' => 0.8,
        'client_comms_auto_draft' => false,
        'daily_task_digest_enabled' => false,
        'inbound_email_enabled' => false,
    ];

    /**
     * Get the team that owns these settings.
     */
    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    /**
     * Get or create settings for a team.
     */
    public static function forTeam(Team $team): static
    {
        return static::firstOrCreate(['team_id' => $team->id]);
    }

    /**
     * Check if human approval is required for a specific action type.
     */
    public function requiresApprovalFor(string $actionType): bool
    {
        return match ($actionType) {
            'external_sends' => $this->require_approval_external_sends,
            'financial' => $this->require_approval_financial,
            'contracts' => $this->require_approval_contracts,
            'scope_changes' => $this->require_approval_scope_changes,
            'client_facing_content' => $this->approval_client_facing_content,
            'financial_data' => $this->approval_financial_data,
            'contractual_changes' => $this->approval_contractual_changes,
            'work_order_creation' => $this->approval_work_order_creation,
            'task_assignment' => $this->approval_task_assignment,
            default => true,
        };
    }

    /**
     * Check if PM Copilot auto-suggest is enabled for this team.
     */
    public function isPMCopilotAutoSuggestEnabled(): bool
    {
        return (bool) $this->pm_copilot_auto_suggest;
    }

    /**
     * Get the PM Copilot auto-approval threshold.
     *
     * Returns the configured threshold (0-1) for automatically approving
     * low-risk suggestions without human review.
     */
    public function getPMCopilotAutoApprovalThreshold(): float
    {
        return (float) ($this->pm_copilot_auto_approval_threshold ?? 0.8);
    }

    /**
     * Check if a confidence score meets the auto-approval threshold.
     */
    public function meetsAutoApprovalThreshold(float $confidenceScore): bool
    {
        return $confidenceScore >= $this->getPMCopilotAutoApprovalThreshold();
    }

    /**
     * Check if there is budget remaining for the month.
     */
    public function hasBudgetRemaining(): bool
    {
        return (float) $this->current_month_spend < (float) $this->total_monthly_budget;
    }

    /**
     * Get the remaining monthly budget.
     */
    public function getRemainingBudgetAttribute(): float
    {
        return max(0, (float) $this->total_monthly_budget - (float) $this->current_month_spend);
    }

    /**
     * Check if client comms auto-draft is enabled for this team.
     */
    public function isClientCommsAutoDraftEnabled(): bool
    {
        return (bool) $this->client_comms_auto_draft;
    }

    /**
     * Check if daily task digest emails are enabled for this team.
     */
    public function isDailyTaskDigestEnabled(): bool
    {
        return (bool) $this->daily_task_digest_enabled;
    }

    /**
     * Check if inbound email processing by the Dispatcher Agent is enabled for this team.
     */
    public function isInboundEmailEnabled(): bool
    {
        return (bool) $this->inbound_email_enabled;
    }
}

<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\CreativityLevel;
use App\Enums\RiskTolerance;
use App\Enums\VerbosityLevel;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AgentConfiguration extends Model
{
    use HasFactory;

    protected $fillable = [
        'team_id',
        'ai_agent_id',
        'ai_provider',
        'ai_model',
        'enabled',
        'daily_run_limit',
        'weekly_run_limit',
        'monthly_budget_cap',
        'current_month_spend',
        'daily_spend',
        'can_create_work_orders',
        'can_modify_tasks',
        'can_access_client_data',
        'can_send_emails',
        'can_modify_deliverables',
        'can_access_financial_data',
        'can_modify_playbooks',
        'can_access_documents',
        'requires_approval',
        'verbosity_level',
        'creativity_level',
        'risk_tolerance',
        'tool_permissions',
    ];

    protected $casts = [
        'enabled' => 'boolean',
        'monthly_budget_cap' => 'decimal:2',
        'current_month_spend' => 'decimal:2',
        'daily_spend' => 'decimal:2',
        'can_create_work_orders' => 'boolean',
        'can_modify_tasks' => 'boolean',
        'can_access_client_data' => 'boolean',
        'can_send_emails' => 'boolean',
        'can_modify_deliverables' => 'boolean',
        'can_access_financial_data' => 'boolean',
        'can_modify_playbooks' => 'boolean',
        'can_access_documents' => 'boolean',
        'requires_approval' => 'boolean',
        'verbosity_level' => VerbosityLevel::class,
        'creativity_level' => CreativityLevel::class,
        'risk_tolerance' => RiskTolerance::class,
        'tool_permissions' => 'array',
    ];

    /**
     * Get the team that owns this configuration.
     */
    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    /**
     * Get the agent this configuration applies to.
     */
    public function agent(): BelongsTo
    {
        return $this->belongsTo(AIAgent::class, 'ai_agent_id');
    }

    /**
     * Check if the agent has a specific permission.
     */
    public function hasPermission(string $permission): bool
    {
        return (bool) $this->getAttribute($permission);
    }

    /**
     * Check if the agent has budget remaining for today.
     */
    public function hasDailyBudgetRemaining(): bool
    {
        return (float) $this->daily_spend < (float) $this->monthly_budget_cap;
    }

    /**
     * Check if the agent has budget remaining for the month.
     */
    public function hasMonthlyBudgetRemaining(): bool
    {
        return (float) $this->current_month_spend < (float) $this->monthly_budget_cap;
    }
}

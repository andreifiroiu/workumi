<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\BudgetType;
use App\Enums\PMCopilotMode;
use App\Enums\Priority;
use App\Enums\WorkOrderStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\Relations\MorphOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class WorkOrder extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'team_id',
        'project_id',
        'work_order_list_id',
        'position_in_list',
        'assigned_to_id',
        'created_by_id',
        'accountable_id',
        'responsible_id',
        'reviewer_id',
        'consulted_ids',
        'informed_ids',
        'party_contact_id',
        'title',
        'description',
        'status',
        'priority',
        'due_date',
        'estimated_hours',
        'budget_type',
        'budget_cost',
        'actual_hours',
        'actual_cost',
        'actual_revenue',
        'acceptance_criteria',
        'sop_attached',
        'sop_name',
        'pm_copilot_mode',
    ];

    protected $casts = [
        'status' => WorkOrderStatus::class,
        'priority' => Priority::class,
        'budget_type' => BudgetType::class,
        'due_date' => 'date',
        'estimated_hours' => 'decimal:2',
        'budget_cost' => 'decimal:2',
        'actual_hours' => 'decimal:2',
        'actual_cost' => 'decimal:2',
        'actual_revenue' => 'decimal:2',
        'acceptance_criteria' => 'array',
        'sop_attached' => 'boolean',
        'consulted_ids' => 'array',
        'informed_ids' => 'array',
        'position_in_list' => 'integer',
    ];

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function workOrderList(): BelongsTo
    {
        return $this->belongsTo(WorkOrderList::class);
    }

    public function assignedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_id');
    }

    /**
     * Get the user who is accountable for this work order.
     */
    public function accountable(): BelongsTo
    {
        return $this->belongsTo(User::class, 'accountable_id');
    }

    /**
     * Get the user who is responsible for this work order.
     */
    public function responsible(): BelongsTo
    {
        return $this->belongsTo(User::class, 'responsible_id');
    }

    /**
     * Get the user who is the explicit reviewer for this work order.
     */
    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewer_id');
    }

    public function partyContact(): BelongsTo
    {
        return $this->belongsTo(Party::class, 'party_contact_id');
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class);
    }

    public function deliverables(): HasMany
    {
        return $this->hasMany(Deliverable::class);
    }

    public function communicationThread(): MorphOne
    {
        return $this->morphOne(CommunicationThread::class, 'threadable');
    }

    public function documents(): MorphMany
    {
        return $this->morphMany(Document::class, 'documentable');
    }

    /**
     * Get all status transitions for this work order.
     */
    public function statusTransitions(): MorphMany
    {
        return $this->morphMany(StatusTransition::class, 'transitionable')
            ->orderByDesc('created_at');
    }

    /**
     * Get the PM Copilot mode for this work order.
     *
     * Returns the configured mode or defaults to 'full' if not set.
     */
    protected function pmCopilotMode(): Attribute
    {
        return Attribute::make(
            get: fn (?string $value) => $value
                ? PMCopilotMode::from($value)
                : PMCopilotMode::Full,
            set: fn (PMCopilotMode|string|null $value) => $value instanceof PMCopilotMode
                ? $value->value
                : $value,
        );
    }

    /**
     * Check if PM Copilot is in staged mode for this work order.
     */
    public function isPMCopilotStagedMode(): bool
    {
        return $this->pm_copilot_mode === PMCopilotMode::Staged;
    }

    /**
     * Check if PM Copilot is in full mode for this work order.
     */
    public function isPMCopilotFullMode(): bool
    {
        return $this->pm_copilot_mode === PMCopilotMode::Full;
    }

    public function scopeForTeam(Builder $query, int $teamId): Builder
    {
        return $query->where('team_id', $teamId);
    }

    public function scopeAssignedTo(Builder $query, int $userId): Builder
    {
        return $query->where('assigned_to_id', $userId);
    }

    public function scopeWithStatus(Builder $query, WorkOrderStatus $status): Builder
    {
        return $query->where('status', $status);
    }

    public function scopeArchived(Builder $query): Builder
    {
        return $query->where('status', WorkOrderStatus::Archived);
    }

    public function scopeNotArchived(Builder $query): Builder
    {
        return $query->where('status', '!=', WorkOrderStatus::Archived);
    }

    public function scopeDelivered(Builder $query): Builder
    {
        return $query->where('status', WorkOrderStatus::Delivered);
    }

    public function scopeNotDelivered(Builder $query): Builder
    {
        return $query->where('status', '!=', WorkOrderStatus::Delivered);
    }

    public function scopeInList(Builder $query, ?int $listId): Builder
    {
        return $query->where('work_order_list_id', $listId);
    }

    public function scopeOrderedInList(Builder $query): Builder
    {
        return $query->orderBy('position_in_list');
    }

    public function scopeUngrouped(Builder $query): Builder
    {
        return $query->whereNull('work_order_list_id');
    }

    /**
     * Scope to filter work orders where the user has any RACI role.
     */
    public function scopeWhereUserHasRaciRole(Builder $query, int $userId, bool $excludeInformed = true): Builder
    {
        return $query->where(function (Builder $q) use ($userId, $excludeInformed) {
            $q->where('accountable_id', $userId)
                ->orWhere('responsible_id', $userId)
                ->orWhereJsonContains('consulted_ids', $userId);

            if (! $excludeInformed) {
                $q->orWhereJsonContains('informed_ids', $userId);
            }
        });
    }

    /**
     * Scope to filter work orders where the user is accountable.
     */
    public function scopeWhereUserIsAccountable(Builder $query, int $userId): Builder
    {
        return $query->where('accountable_id', $userId);
    }

    /**
     * Scope to filter work orders where the user is responsible.
     */
    public function scopeWhereUserIsResponsible(Builder $query, int $userId): Builder
    {
        return $query->where('responsible_id', $userId);
    }

    /**
     * Scope to filter work orders in review status where the user is accountable.
     */
    public function scopeInReviewWhereUserIsAccountable(Builder $query, int $userId): Builder
    {
        return $query->where('status', WorkOrderStatus::InReview)
            ->where('accountable_id', $userId);
    }

    /**
     * Get the RACI roles the given user has for this work order.
     *
     * @return array<string>
     */
    public function getUserRaciRoles(int $userId): array
    {
        $roles = [];

        if ($this->accountable_id === $userId) {
            $roles[] = 'accountable';
        }

        if ($this->responsible_id === $userId) {
            $roles[] = 'responsible';
        }

        if (is_array($this->consulted_ids) && in_array($userId, $this->consulted_ids, true)) {
            $roles[] = 'consulted';
        }

        if (is_array($this->informed_ids) && in_array($userId, $this->informed_ids, true)) {
            $roles[] = 'informed';
        }

        return $roles;
    }

    public function getTasksCountAttribute(): int
    {
        return $this->tasks()->count();
    }

    public function getCompletedTasksCountAttribute(): int
    {
        return $this->tasks()->where('status', 'done')->count();
    }

    public function recalculateActualHours(): void
    {
        $this->actual_hours = $this->tasks()->sum('actual_hours');
        $this->save();

        // Also recalculate costs
        $this->recalculateActualCost();
    }

    /**
     * Recalculate actual cost and revenue from tasks.
     *
     * Sums actual_cost and actual_revenue from all tasks
     * and bubbles up to parent project.
     */
    public function recalculateActualCost(): void
    {
        $this->actual_cost = $this->tasks()->sum('actual_cost');
        $this->actual_revenue = $this->tasks()->sum('actual_revenue');
        $this->save();

        // Bubble up to parent project
        $this->project->recalculateActualCost();
    }
}

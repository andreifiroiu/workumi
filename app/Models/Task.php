<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\BlockerReason;
use App\Enums\TaskStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\Relations\MorphOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class Task extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'team_id',
        'work_order_id',
        'project_id',
        'assigned_to_id',
        'assigned_agent_id',
        'created_by_id',
        'reviewer_id',
        'title',
        'description',
        'status',
        'due_date',
        'estimated_hours',
        'actual_hours',
        'actual_cost',
        'actual_revenue',
        'checklist_items',
        'dependencies',
        'is_blocked',
        'blocker_reason',
        'blocker_details',
        'position_in_work_order',
    ];

    protected $casts = [
        'status' => TaskStatus::class,
        'due_date' => 'date',
        'estimated_hours' => 'decimal:2',
        'actual_hours' => 'decimal:2',
        'actual_cost' => 'decimal:2',
        'actual_revenue' => 'decimal:2',
        'checklist_items' => 'array',
        'dependencies' => 'array',
        'is_blocked' => 'boolean',
        'blocker_reason' => BlockerReason::class,
        'position_in_work_order' => 'integer',
    ];

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    public function workOrder(): BelongsTo
    {
        return $this->belongsTo(WorkOrder::class);
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function assignedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to_id');
    }

    /**
     * Get the user who created this task.
     */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_id');
    }

    /**
     * Get the reviewer assigned to this task.
     */
    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewer_id');
    }

    /**
     * Get the AI agent assigned to this task.
     */
    public function assignedAgent(): BelongsTo
    {
        return $this->belongsTo(AIAgent::class, 'assigned_agent_id');
    }

    /**
     * Get the assignee (User or AIAgent) for this task.
     */
    public function getAssignee(): User|AIAgent|null
    {
        if ($this->assigned_to_id !== null) {
            return $this->assignedTo;
        }

        if ($this->assigned_agent_id !== null) {
            return $this->assignedAgent;
        }

        return null;
    }

    /**
     * Check if the task is assigned to an AI agent.
     */
    public function isAssignedToAgent(): bool
    {
        return $this->assigned_agent_id !== null;
    }

    public function timeEntries(): HasMany
    {
        return $this->hasMany(TimeEntry::class);
    }

    public function documents(): MorphMany
    {
        return $this->morphMany(Document::class, 'documentable');
    }

    /**
     * Get all status transitions for this task.
     */
    public function statusTransitions(): MorphMany
    {
        return $this->morphMany(StatusTransition::class, 'transitionable')
            ->orderByDesc('created_at');
    }

    public function communicationThread(): MorphOne
    {
        return $this->morphOne(CommunicationThread::class, 'threadable');
    }

    public function scopeForTeam(Builder $query, int $teamId): Builder
    {
        return $query->where('team_id', $teamId);
    }

    /**
     * @param  list<int>  $teamIds
     */
    public function scopeForTeams(Builder $query, array $teamIds): Builder
    {
        return $query->whereIn('team_id', $teamIds);
    }

    /**
     * Restrict to records whose project the given user is allowed to see.
     *
     * Team membership alone is not enough: a private project is limited to its
     * owner, its RACI holders and its explicit members, and everything inside it
     * inherits that. withTrashed keeps a soft-deleted project's privacy applied
     * rather than dropping the record from the result entirely.
     */
    public function scopeInProjectsVisibleTo(Builder $query, int $userId): Builder
    {
        return $query->whereHas(
            'project',
            fn (Builder $project) => $project->withTrashed()->visibleTo($userId)
        );
    }

    public function scopeAssignedTo($query, int $userId)
    {
        return $query->where('assigned_to_id', $userId);
    }

    public function scopeWithStatus($query, TaskStatus $status)
    {
        return $query->where('status', $status);
    }

    public function scopeArchived($query)
    {
        return $query->where('status', TaskStatus::Archived);
    }

    public function scopeNotArchived($query)
    {
        return $query->where('status', '!=', TaskStatus::Archived);
    }

    public function scopeOrdered($query)
    {
        return $query->orderBy('position_in_work_order');
    }

    public function getChecklistProgressAttribute(): array
    {
        $items = $this->checklist_items ?? [];
        $total = count($items);
        $completed = collect($items)->where('completed', true)->count();

        return [
            'total' => $total,
            'completed' => $completed,
            'percentage' => $total > 0 ? round(($completed / $total) * 100) : 0,
        ];
    }

    public function toggleChecklistItem(string $itemId, bool $completed): void
    {
        $items = $this->checklist_items ?? [];

        foreach ($items as $index => $item) {
            if ($item['id'] === $itemId) {
                $items[$index]['completed'] = $completed;
                break;
            }
        }

        $this->checklist_items = $items;
        $this->save();
    }

    public function recalculateActualHours(): void
    {
        $this->actual_hours = $this->timeEntries()->sum('hours');
        $this->save();

        // Also recalculate costs
        $this->recalculateActualCost();
    }

    /**
     * Recalculate actual cost and revenue from time entries.
     *
     * Sums calculated_cost and calculated_revenue from all time entries
     * and bubbles up to parent work order.
     */
    public function recalculateActualCost(): void
    {
        $this->actual_cost = $this->timeEntries()->sum('calculated_cost');
        $this->actual_revenue = $this->timeEntries()->sum('calculated_revenue');
        $this->save();

        // Bubble up to parent work order
        $this->workOrder->recalculateActualCost();
    }
}

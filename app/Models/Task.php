<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\BlockerReason;
use App\Enums\TaskStatus;
use App\Support\ChecklistItems;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\JsonEncodingException;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\Relations\MorphOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Log;
use InvalidArgumentException;

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
     * Scope to filter tasks visible to a specific user.
     *
     * A task follows its work order, so a task inside a private project is
     * hidden unless the user can see that work order — or is on the task itself.
     */
    public function scopeVisibleTo(Builder $query, int $userId): Builder
    {
        return $query->where(function (Builder $q) use ($userId) {
            $q->whereHas('workOrder', fn (Builder $workOrder) => $workOrder->visibleTo($userId))
                ->orWhere(function (Builder $task) use ($userId) {
                    $task->where('assigned_to_id', $userId)
                        ->orWhere('reviewer_id', $userId)
                        ->orWhere('created_by_id', $userId);
                });
        });
    }

    /**
     * Check if this task is visible to a specific user.
     *
     * The PHP counterpart of scopeVisibleTo, for authorizing a single record.
     */
    public function isVisibleTo(int $userId): bool
    {
        if ($this->workOrder?->isVisibleTo($userId)) {
            return true;
        }

        return $this->assigned_to_id === $userId
            || $this->reviewer_id === $userId
            || $this->created_by_id === $userId;
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

    /**
     * Normalize on the way in, whichever surface is writing.
     *
     * Four code paths write this column and they disagreed on the shape; an item
     * stored without an `id` is invisible to toggle, edit and delete, all of
     * which match on it. Enforcing the shape here rather than in each caller's
     * validation means malformed rows cannot be created at all.
     *
     * Takes `mixed` rather than `iterable` so a wrong type reports the column it
     * came from instead of a TypeError naming a mutator the caller never called.
     */
    public function setChecklistItemsAttribute(mixed $value): void
    {
        if ($value !== null && ! is_iterable($value)) {
            throw new InvalidArgumentException(
                'checklist_items must be a list of items, '.get_debug_type($value).' given.'
            );
        }

        $normalized = ChecklistItems::normalize($value);

        if (is_countable($value) && count($value) !== count($normalized)) {
            Log::warning('Dropped unusable checklist items', [
                'task_id' => $this->id,
                'submitted' => count($value),
                'stored' => count($normalized),
            ]);
        }

        $encoded = json_encode($normalized);

        // Declaring a mutator bypasses the json cast, and with it the cast's own
        // encode check — without this the column would silently be set to "0".
        if ($encoded === false) {
            throw JsonEncodingException::forAttribute($this, 'checklist_items', json_last_error_msg());
        }

        $this->attributes['checklist_items'] = $encoded;
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

    /**
     * @return bool Whether an item with that id was found. An unknown id used to
     *              save an unchanged array and report success, so the checkbox
     *              silently sprang back with nothing to explain it.
     */
    public function toggleChecklistItem(string $itemId, bool $completed): bool
    {
        $items = $this->checklist_items ?? [];
        $found = false;

        foreach ($items as $index => $item) {
            if (($item['id'] ?? null) === $itemId) {
                $items[$index]['completed'] = $completed;
                $found = true;
                break;
            }
        }

        if (! $found) {
            return false;
        }

        $this->checklist_items = $items;
        $this->save();

        return true;
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

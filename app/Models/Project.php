<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\BudgetType;
use App\Enums\ProjectStatus;
use App\Enums\TaskStatus;
use App\Enums\WorkOrderStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\Relations\MorphOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class Project extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'team_id',
        'party_id',
        'owner_id',
        'accountable_id',
        'responsible_id',
        'consulted_ids',
        'informed_ids',
        'name',
        'description',
        'status',
        'start_date',
        'target_end_date',
        'budget_hours',
        'budget_type',
        'budget_cost',
        'actual_hours',
        'actual_cost',
        'actual_revenue',
        'progress',
        'tags',
        'is_private',
    ];

    protected $casts = [
        'status' => ProjectStatus::class,
        'budget_type' => BudgetType::class,
        'start_date' => 'date',
        'target_end_date' => 'date',
        'budget_hours' => 'decimal:2',
        'budget_cost' => 'decimal:2',
        'actual_hours' => 'decimal:2',
        'actual_cost' => 'decimal:2',
        'actual_revenue' => 'decimal:2',
        'tags' => 'array',
        'consulted_ids' => 'array',
        'informed_ids' => 'array',
        'is_private' => 'boolean',
    ];

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    public function party(): BelongsTo
    {
        return $this->belongsTo(Party::class);
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    /**
     * Get the user who is accountable for this project.
     */
    public function accountable(): BelongsTo
    {
        return $this->belongsTo(User::class, 'accountable_id');
    }

    /**
     * Get the user who is responsible for this project.
     */
    public function responsible(): BelongsTo
    {
        return $this->belongsTo(User::class, 'responsible_id');
    }

    /**
     * Users explicitly granted access to this project, independent of any RACI role.
     */
    public function members(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'project_members')
            ->using(ProjectMember::class)
            ->withPivot('added_by_id')
            ->withTimestamps();
    }

    /**
     * The raw membership rows.
     *
     * Used by the visibility scope so it probes only the indexed pivot rather than joining users.
     */
    public function memberships(): HasMany
    {
        return $this->hasMany(ProjectMember::class);
    }

    public function workOrders(): HasMany
    {
        return $this->hasMany(WorkOrder::class);
    }

    public function workOrderLists(): HasMany
    {
        return $this->hasMany(WorkOrderList::class)->orderBy('position');
    }

    public function ungroupedWorkOrders(): HasMany
    {
        return $this->hasMany(WorkOrder::class)
            ->whereNull('work_order_list_id')
            ->orderBy('position_in_list');
    }

    public function tasks(): HasManyThrough
    {
        return $this->hasManyThrough(Task::class, WorkOrder::class);
    }

    public function deliverables(): HasManyThrough
    {
        return $this->hasManyThrough(Deliverable::class, WorkOrder::class);
    }

    public function communicationThread(): MorphOne
    {
        return $this->morphOne(CommunicationThread::class, 'threadable');
    }

    public function documents(): MorphMany
    {
        return $this->morphMany(Document::class, 'documentable');
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

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', ProjectStatus::Active);
    }

    public function scopeArchived(Builder $query): Builder
    {
        return $query->where('status', ProjectStatus::Archived);
    }

    public function scopeNotArchived(Builder $query): Builder
    {
        return $query->where('status', '!=', ProjectStatus::Archived);
    }

    /**
     * Scope to filter projects visible to a specific user.
     *
     * A user can see a project if:
     * - The project is not private (visible to all team members)
     * - The user is the owner
     * - The user has any RACI role (accountable, responsible, consulted, or informed)
     * - The user has been explicitly added as a member
     */
    public function scopeVisibleTo(Builder $query, int $userId): Builder
    {
        return $query->where(function (Builder $q) use ($userId) {
            $q->where('is_private', false)
                ->orWhere('owner_id', $userId)
                ->orWhere('accountable_id', $userId)
                ->orWhere('responsible_id', $userId)
                ->orWhereJsonContains('consulted_ids', $userId)
                ->orWhereJsonContains('informed_ids', $userId)
                ->orWhereHas('memberships', fn (Builder $m) => $m->where('user_id', $userId));
        });
    }

    /**
     * Check if this project is visible to a specific user.
     */
    public function isVisibleTo(int $userId): bool
    {
        if (! $this->is_private) {
            return true;
        }

        // Checked before membership so the common cases never touch the database.
        if ($this->owner_id === $userId
            || $this->accountable_id === $userId
            || $this->responsible_id === $userId
            || (is_array($this->consulted_ids) && in_array($userId, $this->consulted_ids, true))
            || (is_array($this->informed_ids) && in_array($userId, $this->informed_ids, true))
        ) {
            return true;
        }

        return $this->relationLoaded('members')
            ? $this->members->contains('id', $userId)
            : $this->memberships()->where('user_id', $userId)->exists();
    }

    /**
     * Scope to filter projects where the user has any RACI role.
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
     * Scope to filter projects where the user is accountable.
     */
    public function scopeWhereUserIsAccountable(Builder $query, int $userId): Builder
    {
        return $query->where('accountable_id', $userId);
    }

    /**
     * Scope to filter projects where the user is responsible.
     */
    public function scopeWhereUserIsResponsible(Builder $query, int $userId): Builder
    {
        return $query->where('responsible_id', $userId);
    }

    /**
     * Get the RACI roles the given user has for this project.
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

    public function recalculateProgress(): void
    {
        $workOrders = $this->workOrders->filter(
            fn ($wo) => $wo->status !== WorkOrderStatus::Archived
        );

        if ($workOrders->isEmpty()) {
            $this->progress = 0;
            $this->save();

            return;
        }

        $totalTasks = 0;
        $completedTasks = 0;

        foreach ($workOrders as $workOrder) {
            $tasks = $workOrder->tasks->filter(
                fn ($task) => $task->status !== TaskStatus::Archived
            );
            $totalTasks += $tasks->count();
            $completedTasks += $tasks->where('status', 'done')->count();
        }

        $this->progress = $totalTasks > 0 ? (int) round(($completedTasks / $totalTasks) * 100) : 0;
        $this->save();
    }

    public function recalculateActualHours(): void
    {
        $this->actual_hours = $this->tasks()->sum('tasks.actual_hours');
        $this->save();

        // Also recalculate costs
        $this->recalculateActualCost();
    }

    /**
     * Recalculate actual cost and revenue from tasks via work orders.
     *
     * Sums actual_cost and actual_revenue from all tasks through work orders.
     */
    public function recalculateActualCost(): void
    {
        $this->actual_cost = $this->tasks()->sum('tasks.actual_cost');
        $this->actual_revenue = $this->tasks()->sum('tasks.actual_revenue');
        $this->save();
    }
}

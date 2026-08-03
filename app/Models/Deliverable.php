<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\DeliverableStatus;
use App\Enums\DeliverableType;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Deliverable extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'team_id',
        'work_order_id',
        'project_id',
        'title',
        'description',
        'type',
        'status',
        'version',
        'created_date',
        'delivered_date',
        'file_url',
        'acceptance_criteria',
    ];

    protected $casts = [
        'type' => DeliverableType::class,
        'status' => DeliverableStatus::class,
        'created_date' => 'date',
        'delivered_date' => 'date',
        'acceptance_criteria' => 'array',
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

    public function documents(): MorphMany
    {
        return $this->morphMany(Document::class, 'documentable');
    }

    /**
     * Get all versions for this deliverable.
     */
    public function versions(): HasMany
    {
        return $this->hasMany(DeliverableVersion::class);
    }

    /**
     * Get the latest version of this deliverable.
     */
    public function latestVersion(): HasOne
    {
        return $this->hasOne(DeliverableVersion::class)
            ->orderByDesc('version_number');
    }

    /**
     * Get the count of versions for this deliverable.
     */
    protected function versionCount(): Attribute
    {
        return Attribute::make(
            get: fn () => $this->versions()->count()
        );
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
     * Scope to filter deliverables visible to a specific user.
     *
     * Deliverables carry no assignment of their own, so they follow their work
     * order exactly.
     */
    public function scopeVisibleTo(Builder $query, int $userId): Builder
    {
        return $query->whereHas('workOrder', fn (Builder $workOrder) => $workOrder->visibleTo($userId));
    }

    /**
     * Check if this deliverable is visible to a specific user.
     *
     * The PHP counterpart of scopeVisibleTo, for authorizing a single record.
     */
    public function isVisibleTo(int $userId): bool
    {
        return (bool) $this->workOrder?->isVisibleTo($userId);
    }
}

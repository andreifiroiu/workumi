<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class ReviewSnooze extends Model
{
    protected $fillable = [
        'team_id',
        'user_id',
        'flow',
        'snoozable_type',
        'snoozable_id',
        'snoozed_until',
    ];

    protected function casts(): array
    {
        return [
            'snoozed_until' => 'datetime',
        ];
    }

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function snoozable(): MorphTo
    {
        return $this->morphTo();
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('snoozed_until', '>', now());
    }

    public function scopeForUserAndFlow(Builder $query, int $userId, string $flow): Builder
    {
        return $query->where('user_id', $userId)->where('flow', $flow);
    }
}

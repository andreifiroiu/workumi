<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class StatusTransition extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'transitionable_type',
        'transitionable_id',
        'user_id',
        'action_type',
        'from_status',
        'to_status',
        'from_assigned_to_id',
        'to_assigned_to_id',
        'from_assigned_agent_id',
        'to_assigned_agent_id',
        'from_due_date',
        'to_due_date',
        'comment',
        'created_at',
    ];

    protected $casts = [
        'from_due_date' => 'date',
        'to_due_date' => 'date',
        'created_at' => 'datetime',
    ];

    /**
     * Get the parent transitionable model (Task or WorkOrder).
     */
    public function transitionable(): MorphTo
    {
        return $this->morphTo();
    }

    /**
     * Get the user who performed the transition.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the user who was previously assigned.
     */
    public function fromAssignedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'from_assigned_to_id');
    }

    /**
     * Get the user who is now assigned.
     */
    public function toAssignedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'to_assigned_to_id');
    }

    /**
     * Get the AI agent who was previously assigned.
     */
    public function fromAssignedAgent(): BelongsTo
    {
        return $this->belongsTo(AIAgent::class, 'from_assigned_agent_id');
    }

    /**
     * Get the AI agent who is now assigned.
     */
    public function toAssignedAgent(): BelongsTo
    {
        return $this->belongsTo(AIAgent::class, 'to_assigned_agent_id');
    }

    /**
     * Check if this transition is an assignment change.
     */
    public function isAssignmentChange(): bool
    {
        return $this->action_type === 'assignment_change';
    }

    /**
     * Check if this transition is a status change.
     */
    public function isStatusChange(): bool
    {
        return $this->action_type === 'status_change';
    }

    /**
     * Check if this transition is a due-date change.
     */
    public function isDueDateChange(): bool
    {
        return $this->action_type === 'due_date_change';
    }
}

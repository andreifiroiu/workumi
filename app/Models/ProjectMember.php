<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\Pivot;

/**
 * An explicit grant of access to a project, independent of any RACI role.
 */
class ProjectMember extends Pivot
{
    protected $table = 'project_members';

    /**
     * The table has an auto-incrementing id; Pivot defaults this to false.
     */
    public $incrementing = true;

    protected $fillable = [
        'project_id',
        'user_id',
        'added_by_id',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function addedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'added_by_id');
    }
}

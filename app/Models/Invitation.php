<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Jurager\Teams\Models\Invitation as BaseInvitation;
use Jurager\Teams\Support\Facades\Teams as TeamsFacade;

class Invitation extends BaseInvitation
{
    /**
     * Get the team role that the invitation belongs to.
     *
     * The package resolves this relation through `team_id` instead of `role_id`, which surfaces the
     * wrong role name on the accept page and in the pending-invitations list.
     */
    public function role(): BelongsTo
    {
        return $this->belongsTo(TeamsFacade::model('role'), 'role_id');
    }
}

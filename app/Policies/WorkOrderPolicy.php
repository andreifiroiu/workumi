<?php

namespace App\Policies;

use App\Models\Project;
use App\Models\User;
use App\Models\WorkOrder;

class WorkOrderPolicy
{
    public function view(User $user, WorkOrder $workOrder): bool
    {
        return $this->canAccess($user, $workOrder);
    }

    public function update(User $user, WorkOrder $workOrder): bool
    {
        return $this->canAccess($user, $workOrder);
    }

    public function delete(User $user, WorkOrder $workOrder): bool
    {
        return $this->canAccess($user, $workOrder);
    }

    /**
     * A work order inherits the privacy of the project that contains it.
     */
    private function canAccess(User $user, WorkOrder $workOrder): bool
    {
        if ($user->currentTeam?->id !== $workOrder->team_id) {
            return false;
        }

        // Fall back to a trashed lookup: the default relation returns null for a soft-deleted
        // project, which would drop the privacy check entirely.
        $project = $workOrder->project ?: $workOrder->project()->withTrashed()->first();

        return ! $project instanceof Project || $project->isVisibleTo($user->id);
    }
}

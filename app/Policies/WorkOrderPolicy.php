<?php

namespace App\Policies;

use App\Models\User;
use App\Models\WorkOrder;

class WorkOrderPolicy
{
    /**
     * A work order inherits its project's privacy: inside a private project it
     * is limited to the people who can see the project, plus anyone with a role
     * on the work order itself.
     */
    public function view(User $user, WorkOrder $workOrder): bool
    {
        return $this->belongsToCurrentTeam($user, $workOrder)
            && $workOrder->isVisibleTo($user->id);
    }

    public function update(User $user, WorkOrder $workOrder): bool
    {
        return $this->belongsToCurrentTeam($user, $workOrder)
            && $workOrder->isVisibleTo($user->id);
    }

    public function delete(User $user, WorkOrder $workOrder): bool
    {
        return $this->belongsToCurrentTeam($user, $workOrder)
            && $workOrder->isVisibleTo($user->id);
    }

    private function belongsToCurrentTeam(User $user, WorkOrder $workOrder): bool
    {
        return $user->currentTeam?->id === $workOrder->team_id;
    }
}

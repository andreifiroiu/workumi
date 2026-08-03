<?php

namespace App\Policies;

use App\Models\User;
use App\Models\WorkOrder;
use App\Policies\Concerns\ChecksTeamAccess;

class WorkOrderPolicy
{
    use ChecksTeamAccess;

    /**
     * A work order inherits its project's privacy: inside a private project it
     * is limited to the people who can see the project, plus anyone with a role
     * on the work order itself.
     */
    public function view(User $user, WorkOrder $workOrder): bool
    {
        return $this->inTeam($user, $workOrder->team_id)
            && $workOrder->isVisibleTo($user->id);
    }

    public function create(User $user): bool
    {
        return $this->canWriteInCurrentTeam($user);
    }

    /**
     * Writing a work order you cannot see would be incoherent, so update and
     * delete carry the same visibility requirement as view, on top of the
     * role check that excludes viewers.
     */
    public function update(User $user, WorkOrder $workOrder): bool
    {
        return $this->canWrite($user, $workOrder->team_id)
            && $workOrder->isVisibleTo($user->id);
    }

    public function delete(User $user, WorkOrder $workOrder): bool
    {
        return $this->canWrite($user, $workOrder->team_id)
            && $workOrder->isVisibleTo($user->id);
    }
}

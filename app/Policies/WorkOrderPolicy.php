<?php

namespace App\Policies;

use App\Models\User;
use App\Models\WorkOrder;
use App\Policies\Concerns\ChecksTeamAccess;

class WorkOrderPolicy
{
    use ChecksTeamAccess;

    public function view(User $user, WorkOrder $workOrder): bool
    {
        return $this->inTeam($user, $workOrder->team_id);
    }

    public function create(User $user): bool
    {
        return $this->canWriteInCurrentTeam($user);
    }

    public function update(User $user, WorkOrder $workOrder): bool
    {
        return $this->canWrite($user, $workOrder->team_id);
    }

    public function delete(User $user, WorkOrder $workOrder): bool
    {
        return $this->canWrite($user, $workOrder->team_id);
    }
}

<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\User;
use App\Models\WorkOrderList;
use App\Policies\Concerns\ChecksTeamAccess;

class WorkOrderListPolicy
{
    use ChecksTeamAccess;

    public function view(User $user, WorkOrderList $workOrderList): bool
    {
        return $this->inTeam($user, $workOrderList->team_id);
    }

    public function create(User $user): bool
    {
        return $this->canWriteInCurrentTeam($user);
    }

    public function update(User $user, WorkOrderList $workOrderList): bool
    {
        return $this->canWrite($user, $workOrderList->team_id);
    }

    public function delete(User $user, WorkOrderList $workOrderList): bool
    {
        return $this->canWrite($user, $workOrderList->team_id);
    }
}

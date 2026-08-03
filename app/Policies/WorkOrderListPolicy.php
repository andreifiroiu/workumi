<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\User;
use App\Models\WorkOrderList;
use App\Policies\Concerns\ChecksTeamAccess;

class WorkOrderListPolicy
{
    use ChecksTeamAccess;

    /**
     * A list belongs to a project, so it is only reachable by the people who
     * can see that project. Without this, the lists of a private project stay
     * open and moveWorkOrder can shuffle work orders inside it.
     */
    public function view(User $user, WorkOrderList $workOrderList): bool
    {
        return $this->inTeam($user, $workOrderList->team_id)
            && $this->projectIsVisible($user, $workOrderList);
    }

    public function create(User $user): bool
    {
        return $this->canWriteInCurrentTeam($user);
    }

    public function update(User $user, WorkOrderList $workOrderList): bool
    {
        return $this->canWrite($user, $workOrderList->team_id)
            && $this->projectIsVisible($user, $workOrderList);
    }

    public function delete(User $user, WorkOrderList $workOrderList): bool
    {
        return $this->canWrite($user, $workOrderList->team_id)
            && $this->projectIsVisible($user, $workOrderList);
    }

    private function projectIsVisible(User $user, WorkOrderList $workOrderList): bool
    {
        return (bool) $workOrderList->project?->isVisibleTo($user->id);
    }
}

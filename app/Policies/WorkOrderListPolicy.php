<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\User;
use App\Models\WorkOrderList;

class WorkOrderListPolicy
{
    /**
     * A list belongs to a project, so it is only reachable by the people who
     * can see that project. Without this, the lists of a private project stay
     * open and moveWorkOrder can shuffle work orders inside it.
     */
    public function view(User $user, WorkOrderList $workOrderList): bool
    {
        return $this->belongsToVisibleProject($user, $workOrderList);
    }

    public function create(User $user): bool
    {
        return $user->currentTeam !== null;
    }

    public function update(User $user, WorkOrderList $workOrderList): bool
    {
        return $this->belongsToVisibleProject($user, $workOrderList);
    }

    public function delete(User $user, WorkOrderList $workOrderList): bool
    {
        return $this->belongsToVisibleProject($user, $workOrderList);
    }

    private function belongsToVisibleProject(User $user, WorkOrderList $workOrderList): bool
    {
        return $user->currentTeam?->id === $workOrderList->team_id
            && (bool) $workOrderList->project?->isVisibleTo($user->id);
    }
}

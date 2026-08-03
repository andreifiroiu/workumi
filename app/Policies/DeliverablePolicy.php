<?php

namespace App\Policies;

use App\Models\Deliverable;
use App\Models\User;
use App\Policies\Concerns\ChecksTeamAccess;

class DeliverablePolicy
{
    use ChecksTeamAccess;

    /**
     * A deliverable carries no assignment of its own, so it follows its work
     * order exactly.
     */
    public function view(User $user, Deliverable $deliverable): bool
    {
        return $this->inTeam($user, $deliverable->team_id)
            && $deliverable->isVisibleTo($user->id);
    }

    public function create(User $user): bool
    {
        return $this->canWriteInCurrentTeam($user);
    }

    public function update(User $user, Deliverable $deliverable): bool
    {
        return $this->canWrite($user, $deliverable->team_id)
            && $deliverable->isVisibleTo($user->id);
    }

    public function delete(User $user, Deliverable $deliverable): bool
    {
        return $this->canWrite($user, $deliverable->team_id)
            && $deliverable->isVisibleTo($user->id);
    }
}

<?php

namespace App\Policies;

use App\Models\Deliverable;
use App\Models\User;

class DeliverablePolicy
{
    /**
     * A deliverable carries no assignment of its own, so it follows its work
     * order exactly.
     */
    public function view(User $user, Deliverable $deliverable): bool
    {
        return $this->belongsToCurrentTeam($user, $deliverable)
            && $deliverable->isVisibleTo($user->id);
    }

    public function update(User $user, Deliverable $deliverable): bool
    {
        return $this->belongsToCurrentTeam($user, $deliverable)
            && $deliverable->isVisibleTo($user->id);
    }

    public function delete(User $user, Deliverable $deliverable): bool
    {
        return $this->belongsToCurrentTeam($user, $deliverable)
            && $deliverable->isVisibleTo($user->id);
    }

    private function belongsToCurrentTeam(User $user, Deliverable $deliverable): bool
    {
        return $user->currentTeam?->id === $deliverable->team_id;
    }
}

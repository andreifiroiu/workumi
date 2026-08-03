<?php

namespace App\Policies;

use App\Models\Playbook;
use App\Models\User;
use App\Policies\Concerns\ChecksTeamAccess;

class PlaybookPolicy
{
    use ChecksTeamAccess;

    /**
     * Determine whether the user can view any playbooks.
     */
    public function viewAny(User $user): bool
    {
        return $user->currentTeam !== null;
    }

    /**
     * Determine whether the user can view the playbook.
     */
    public function view(User $user, Playbook $playbook): bool
    {
        return $this->inTeam($user, $playbook->team_id);
    }

    /**
     * Determine whether the user can create playbooks.
     */
    public function create(User $user): bool
    {
        return $this->canWriteInCurrentTeam($user);
    }

    /**
     * Determine whether the user can update the playbook.
     */
    public function update(User $user, Playbook $playbook): bool
    {
        return $this->canWrite($user, $playbook->team_id);
    }

    /**
     * Determine whether the user can delete the playbook.
     *
     * Only the creator or a team administrator may delete.
     */
    public function delete(User $user, Playbook $playbook): bool
    {
        return $this->canWrite($user, $playbook->team_id)
            && ($user->id === $playbook->created_by || $this->canAdminister($user, $playbook->team_id));
    }
}

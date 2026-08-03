<?php

namespace App\Policies;

use App\Models\Project;
use App\Models\User;

class ProjectPolicy
{
    public function view(User $user, Project $project): bool
    {
        if ($user->currentTeam?->id !== $project->team_id) {
            return false;
        }

        if (! $project->is_private) {
            return true;
        }

        return $project->isVisibleTo($user->id);
    }

    public function update(User $user, Project $project): bool
    {
        return $user->currentTeam?->id === $project->team_id;
    }

    public function delete(User $user, Project $project): bool
    {
        return $user->currentTeam?->id === $project->team_id;
    }

    public function togglePrivacy(User $user, Project $project): bool
    {
        return $user->currentTeam?->id === $project->team_id
            && $user->id === $project->owner_id;
    }

    /**
     * Anyone who can see the project may grant access to it.
     *
     * Since explicit members are themselves visible-to, a member can add further members.
     */
    public function manageMembers(User $user, Project $project): bool
    {
        return $this->view($user, $project);
    }
}

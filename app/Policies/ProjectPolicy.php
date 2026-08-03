<?php

namespace App\Policies;

use App\Models\Project;
use App\Models\User;
use App\Policies\Concerns\ChecksTeamAccess;

class ProjectPolicy
{
    use ChecksTeamAccess;

    /**
     * A private project is limited to the people with a RACI role on it.
     * Project::isVisibleTo already returns true for any non-private project.
     */
    public function view(User $user, Project $project): bool
    {
        return $this->inTeam($user, $project->team_id)
            && $project->isVisibleTo($user->id);
    }

    public function create(User $user): bool
    {
        return $this->canWriteInCurrentTeam($user);
    }

    /**
     * Writing a project you cannot see would be incoherent, so update and
     * delete carry the same visibility requirement as view, on top of the
     * role check that excludes viewers.
     */
    public function update(User $user, Project $project): bool
    {
        return $this->canWrite($user, $project->team_id)
            && $project->isVisibleTo($user->id);
    }

    public function delete(User $user, Project $project): bool
    {
        return $this->canWrite($user, $project->team_id)
            && $project->isVisibleTo($user->id);
    }

    public function togglePrivacy(User $user, Project $project): bool
    {
        return $this->canWrite($user, $project->team_id)
            && $user->id === $project->owner_id;
    }
}

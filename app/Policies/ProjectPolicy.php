<?php

namespace App\Policies;

use App\Models\Project;
use App\Models\User;
use App\Policies\Concerns\ChecksTeamAccess;

class ProjectPolicy
{
    use ChecksTeamAccess;

    public function view(User $user, Project $project): bool
    {
        if (! $this->inTeam($user, $project->team_id)) {
            return false;
        }

        if (! $project->is_private) {
            return true;
        }

        return $project->isVisibleTo($user->id);
    }

    public function create(User $user): bool
    {
        return $this->canWriteInCurrentTeam($user);
    }

    public function update(User $user, Project $project): bool
    {
        return $this->canWrite($user, $project->team_id);
    }

    public function delete(User $user, Project $project): bool
    {
        return $this->canWrite($user, $project->team_id);
    }

    public function togglePrivacy(User $user, Project $project): bool
    {
        return $this->canWrite($user, $project->team_id)
            && $user->id === $project->owner_id;
    }
}

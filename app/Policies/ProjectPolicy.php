<?php

namespace App\Policies;

use App\Models\Project;
use App\Models\User;

class ProjectPolicy
{
    /**
     * A private project is limited to the people with a RACI role on it.
     * Project::isVisibleTo already returns true for any non-private project.
     */
    public function view(User $user, Project $project): bool
    {
        return $this->belongsToCurrentTeam($user, $project)
            && $project->isVisibleTo($user->id);
    }

    /**
     * Writing a project you cannot see would be incoherent, so update and
     * delete carry the same visibility requirement as view.
     */
    public function update(User $user, Project $project): bool
    {
        return $this->belongsToCurrentTeam($user, $project)
            && $project->isVisibleTo($user->id);
    }

    public function delete(User $user, Project $project): bool
    {
        return $this->belongsToCurrentTeam($user, $project)
            && $project->isVisibleTo($user->id);
    }

    public function togglePrivacy(User $user, Project $project): bool
    {
        return $this->belongsToCurrentTeam($user, $project)
            && $user->id === $project->owner_id;
    }

    private function belongsToCurrentTeam(User $user, Project $project): bool
    {
        return $user->currentTeam?->id === $project->team_id;
    }
}

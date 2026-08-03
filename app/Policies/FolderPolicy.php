<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Folder;
use App\Models\Project;
use App\Models\User;
use App\Policies\Concerns\ChecksTeamAccess;

class FolderPolicy
{
    use ChecksTeamAccess;

    /**
     * Determine if the user can view the folder.
     *
     * Folder access inherits from its scope:
     * - Project folders follow project permissions
     * - Team folders follow team permissions
     */
    public function view(User $user, Folder $folder): bool
    {
        // User must be in the same team
        if (! $this->inTeam($user, $folder->team_id)) {
            return false;
        }

        // Check access based on folder scope
        return $this->canAccessFolderScope($user, $folder);
    }

    /**
     * Determine if the user can create folders.
     *
     * Requires team membership and access to the parent scope.
     */
    public function create(User $user, Folder $folder): bool
    {
        // Writing requires a non-viewer role in the folder's team
        if (! $this->canWrite($user, $folder->team_id)) {
            return false;
        }

        // Check access based on folder scope
        return $this->canAccessFolderScope($user, $folder);
    }

    /**
     * Determine if the user can update the folder.
     *
     * Folder update inherits from its scope.
     */
    public function update(User $user, Folder $folder): bool
    {
        // Writing requires a non-viewer role in the folder's team
        if (! $this->canWrite($user, $folder->team_id)) {
            return false;
        }

        // Check access based on folder scope
        return $this->canAccessFolderScope($user, $folder);
    }

    /**
     * Determine if the user can delete the folder.
     *
     * Folder deletion inherits from its scope.
     */
    public function delete(User $user, Folder $folder): bool
    {
        // Writing requires a non-viewer role in the folder's team
        if (! $this->canWrite($user, $folder->team_id)) {
            return false;
        }

        // Check access based on folder scope
        return $this->canAccessFolderScope($user, $folder);
    }

    /**
     * Check if the user can access the folder based on its scope.
     */
    private function canAccessFolderScope(User $user, Folder $folder): bool
    {
        // Team-scoped folders: just require team membership (already checked)
        if ($folder->isTeamScoped()) {
            return true;
        }

        // Project-scoped folders: check project access
        if ($folder->isProjectScoped()) {
            $project = $folder->project;

            if ($project === null) {
                return false;
            }

            return $this->canAccessProject($user, $project);
        }

        return true;
    }

    /**
     * Check if user can access a project.
     */
    private function canAccessProject(User $user, Project $project): bool
    {
        // User must be in the same team
        if ($user->currentTeam?->id !== $project->team_id) {
            return false;
        }

        // If project is not private, all team members can view
        if (! $project->is_private) {
            return true;
        }

        // For private projects, check if user has visibility
        return $project->isVisibleTo($user->id);
    }
}

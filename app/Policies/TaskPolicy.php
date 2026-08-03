<?php

namespace App\Policies;

use App\Models\Project;
use App\Models\Task;
use App\Models\User;

class TaskPolicy
{
    public function view(User $user, Task $task): bool
    {
        return $this->canAccess($user, $task);
    }

    public function update(User $user, Task $task): bool
    {
        return $this->canAccess($user, $task);
    }

    public function delete(User $user, Task $task): bool
    {
        return $this->canAccess($user, $task);
    }

    /**
     * A task inherits the privacy of the project that contains it.
     */
    private function canAccess(User $user, Task $task): bool
    {
        if ($user->currentTeam?->id !== $task->team_id) {
            return false;
        }

        // Fall back to a trashed lookup: the default relation returns null for a soft-deleted
        // project, which would drop the privacy check entirely.
        $project = $task->project ?: $task->project()->withTrashed()->first();

        return ! $project instanceof Project || $project->isVisibleTo($user->id);
    }
}

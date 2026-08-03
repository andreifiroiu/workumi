<?php

namespace App\Policies;

use App\Models\Task;
use App\Models\User;
use App\Policies\Concerns\ChecksTeamAccess;

class TaskPolicy
{
    use ChecksTeamAccess;

    /**
     * A task follows its work order, so a task inside a private project is
     * limited to the people who can see that work order — or who are on the
     * task itself.
     */
    public function view(User $user, Task $task): bool
    {
        return $this->inTeam($user, $task->team_id)
            && $task->isVisibleTo($user->id);
    }

    public function create(User $user): bool
    {
        return $this->canWriteInCurrentTeam($user);
    }

    public function update(User $user, Task $task): bool
    {
        return $this->canWrite($user, $task->team_id)
            && $task->isVisibleTo($user->id);
    }

    public function delete(User $user, Task $task): bool
    {
        return $this->canWrite($user, $task->team_id)
            && $task->isVisibleTo($user->id);
    }
}

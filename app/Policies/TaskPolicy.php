<?php

namespace App\Policies;

use App\Models\Task;
use App\Models\User;

class TaskPolicy
{
    /**
     * A task follows its work order, so a task inside a private project is
     * limited to the people who can see that work order — or who are on the
     * task itself.
     */
    public function view(User $user, Task $task): bool
    {
        return $this->belongsToCurrentTeam($user, $task)
            && $task->isVisibleTo($user->id);
    }

    public function update(User $user, Task $task): bool
    {
        return $this->belongsToCurrentTeam($user, $task)
            && $task->isVisibleTo($user->id);
    }

    public function delete(User $user, Task $task): bool
    {
        return $this->belongsToCurrentTeam($user, $task)
            && $task->isVisibleTo($user->id);
    }

    private function belongsToCurrentTeam(User $user, Task $task): bool
    {
        return $user->currentTeam?->id === $task->team_id;
    }
}

<?php

namespace App\Policies;

use App\Models\Task;
use App\Models\User;
use App\Policies\Concerns\ChecksTeamAccess;

class TaskPolicy
{
    use ChecksTeamAccess;

    public function view(User $user, Task $task): bool
    {
        return $this->inTeam($user, $task->team_id);
    }

    public function create(User $user): bool
    {
        return $this->canWriteInCurrentTeam($user);
    }

    public function update(User $user, Task $task): bool
    {
        return $this->canWrite($user, $task->team_id);
    }

    public function delete(User $user, Task $task): bool
    {
        return $this->canWrite($user, $task->team_id);
    }
}

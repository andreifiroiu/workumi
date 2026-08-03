<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\TimeEntry;
use App\Models\User;
use App\Policies\Concerns\ChecksTeamAccess;

class TimeEntryPolicy
{
    use ChecksTeamAccess;

    public function view(User $user, TimeEntry $timeEntry): bool
    {
        return $user->id === $timeEntry->user_id
            && $this->inTeam($user, $timeEntry->team_id);
    }

    public function create(User $user): bool
    {
        return $this->canWriteInCurrentTeam($user);
    }

    public function update(User $user, TimeEntry $timeEntry): bool
    {
        return $user->id === $timeEntry->user_id
            && $this->canWrite($user, $timeEntry->team_id);
    }

    public function delete(User $user, TimeEntry $timeEntry): bool
    {
        return $user->id === $timeEntry->user_id
            && $this->canWrite($user, $timeEntry->team_id);
    }
}

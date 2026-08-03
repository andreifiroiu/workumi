<?php

namespace App\Policies;

use App\Models\Party;
use App\Models\User;
use App\Policies\Concerns\ChecksTeamAccess;

class PartyPolicy
{
    use ChecksTeamAccess;

    public function view(User $user, Party $party): bool
    {
        return $this->inTeam($user, $party->team_id);
    }

    public function create(User $user): bool
    {
        return $this->canWriteInCurrentTeam($user);
    }

    public function update(User $user, Party $party): bool
    {
        return $this->canWrite($user, $party->team_id);
    }

    public function delete(User $user, Party $party): bool
    {
        return $this->canWrite($user, $party->team_id);
    }
}

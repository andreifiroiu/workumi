<?php

namespace App\Policies;

use App\Models\InboxItem;
use App\Models\User;
use App\Policies\Concerns\ChecksTeamAccess;

class InboxItemPolicy
{
    use ChecksTeamAccess;

    public function view(User $user, InboxItem $inboxItem): bool
    {
        return $this->inTeam($user, $inboxItem->team_id);
    }

    public function update(User $user, InboxItem $inboxItem): bool
    {
        return $this->canWrite($user, $inboxItem->team_id);
    }

    public function delete(User $user, InboxItem $inboxItem): bool
    {
        return $this->canWrite($user, $inboxItem->team_id);
    }
}

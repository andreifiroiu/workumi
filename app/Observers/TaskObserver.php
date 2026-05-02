<?php

namespace App\Observers;

use App\Models\Task;

class TaskObserver
{
    public function deleting(Task $task): void
    {
        $task->timeEntries()->delete();
        $task->communicationThread?->delete();
        $task->statusTransitions()->delete();
        $task->documents()->get()->each->forceDelete();
    }
}

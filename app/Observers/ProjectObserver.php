<?php

namespace App\Observers;

use App\Models\Project;

class ProjectObserver
{
    public function deleting(Project $project): void
    {
        $project->workOrders()->get()->each->delete();
        $project->workOrderLists()->delete();
        $project->communicationThread?->delete();
        $project->documents()->get()->each->forceDelete();
    }
}

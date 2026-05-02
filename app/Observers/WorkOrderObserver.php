<?php

namespace App\Observers;

use App\Models\WorkOrder;

class WorkOrderObserver
{
    public function deleting(WorkOrder $workOrder): void
    {
        $workOrder->tasks()->get()->each->delete();
        $workOrder->deliverables()->delete();
        $workOrder->communicationThread?->delete();
        $workOrder->statusTransitions()->delete();
        $workOrder->documents()->get()->each->forceDelete();
    }
}

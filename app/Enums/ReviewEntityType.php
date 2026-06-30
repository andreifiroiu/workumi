<?php

namespace App\Enums;

use App\Models\Task;
use App\Models\WorkOrder;
use Illuminate\Database\Eloquent\Model;

enum ReviewEntityType: string
{
    case WorkOrder = 'work_order';
    case Task = 'task';

    /**
     * @return class-string<Model>
     */
    public function modelClass(): string
    {
        return match ($this) {
            self::WorkOrder => WorkOrder::class,
            self::Task => Task::class,
        };
    }
}

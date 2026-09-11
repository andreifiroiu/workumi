<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * The kinds of record Quick Capture can create.
 */
enum CaptureType: string
{
    case Project = 'project';
    case WorkOrder = 'work_order';
    case Task = 'task';
    case Note = 'note';

    public function label(): string
    {
        return match ($this) {
            self::Project => 'Project',
            self::WorkOrder => 'Work Order',
            self::Task => 'Task',
            self::Note => 'Note',
        };
    }
}

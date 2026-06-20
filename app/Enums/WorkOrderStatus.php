<?php

declare(strict_types=1);

namespace App\Enums;

enum WorkOrderStatus: string
{
    case Draft = 'draft';
    case Active = 'active';
    case InReview = 'in_review';
    case Approved = 'approved';
    case Delivered = 'delivered';
    case Blocked = 'blocked';
    case Cancelled = 'cancelled';
    case RevisionRequested = 'revision_requested';
    case Archived = 'archived';
    case Backlog = 'backlog';

    public function label(): string
    {
        return match ($this) {
            self::Draft => 'Draft',
            self::Active => 'Active',
            self::InReview => 'In Review',
            self::Approved => 'Approved',
            self::Delivered => 'Delivered',
            self::Blocked => 'Blocked',
            self::Cancelled => 'Cancelled',
            self::RevisionRequested => 'Revision Requested',
            self::Archived => 'Archived',
            self::Backlog => 'Backlog',
        };
    }

    public function color(): string
    {
        return match ($this) {
            self::Draft => 'slate',
            self::Active => 'indigo',
            self::InReview => 'amber',
            self::Approved => 'emerald',
            self::Delivered => 'emerald',
            self::Blocked => 'red',
            self::Cancelled => 'red',
            self::RevisionRequested => 'orange',
            self::Archived => 'slate',
            self::Backlog => 'zinc',
        };
    }
}

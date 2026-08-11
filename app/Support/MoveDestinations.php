<?php

declare(strict_types=1);

namespace App\Support;

use App\Models\Project;
use App\Models\WorkOrderList;

/**
 * The projects a work order may be moved into, with the lists inside each.
 *
 * Deliberately the same predicate MoveWorkOrderRequest validates against, so the
 * picker and the validator agree by construction rather than by coincidence: an
 * archived or invisible project is absent from the menu *and* refused by the
 * endpoint.
 */
final class MoveDestinations
{
    /**
     * @return list<array{id: string, name: string, isPrivate: bool, lists: list<array{id: string, name: string}>}>
     */
    public static function forTeam(int $teamId, int $userId): array
    {
        return Project::query()
            ->forTeam($teamId)
            ->notArchived()
            ->visibleTo($userId)
            ->with(['workOrderLists' => fn ($query) => $query->ordered()])
            ->orderBy('name')
            ->get()
            ->map(fn (Project $project) => [
                'id' => (string) $project->id,
                'name' => $project->name,
                'isPrivate' => (bool) $project->is_private,
                'lists' => $project->workOrderLists
                    ->map(fn (WorkOrderList $list) => [
                        'id' => (string) $list->id,
                        'name' => $list->name,
                    ])
                    ->values()
                    ->all(),
            ])
            ->values()
            ->all();
    }
}

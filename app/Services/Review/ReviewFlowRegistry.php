<?php

declare(strict_types=1);

namespace App\Services\Review;

use App\Models\Team;
use App\Models\User;
use App\Services\Review\Contracts\ReviewFlow;
use App\Services\Review\Flows\TasksMissingAssigneeFlow;
use App\Services\Review\Flows\WorkOrdersMissingAssigneeFlow;
use App\Services\Review\Flows\WorkOrdersMissingDueDateFlow;
use App\Services\Review\Flows\WorkOrdersOverdueFlow;

class ReviewFlowRegistry
{
    /**
     * @var array<int, class-string<ReviewFlow>>
     */
    private const FLOWS = [
        WorkOrdersMissingDueDateFlow::class,
        WorkOrdersMissingAssigneeFlow::class,
        TasksMissingAssigneeFlow::class,
        WorkOrdersOverdueFlow::class,
    ];

    /**
     * @return array<string, ReviewFlow>
     */
    public function all(): array
    {
        $flows = [];

        foreach (self::FLOWS as $flowClass) {
            $flow = new $flowClass;
            $flows[$flow->type()->value] = $flow;
        }

        return $flows;
    }

    public function find(string $key): ?ReviewFlow
    {
        return $this->all()[$key] ?? null;
    }

    public function findOrFail(string $key): ReviewFlow
    {
        $flow = $this->find($key);

        abort_if($flow === null, 404, "Unknown review flow [{$key}].");

        return $flow;
    }

    /**
     * Launcher data: each flow plus the number of items still needing review.
     *
     * @return array<int, array<string, mixed>>
     */
    public function summaries(Team $team, User $user): array
    {
        return collect($this->all())
            ->map(fn (ReviewFlow $flow) => [
                'key' => $flow->type()->value,
                'title' => $flow->type()->label(),
                'description' => $flow->type()->description(),
                'icon' => $flow->type()->icon(),
                'entityType' => $flow->type()->entityType()->value,
                'count' => $flow->query($team, $user)->count(),
            ])
            ->values()
            ->all();
    }
}

<?php

declare(strict_types=1);

namespace App\Services\Review\Contracts;

use App\Enums\ReviewFlowType;
use App\Models\Team;
use App\Models\User;
use App\Services\Review\ReviewAction;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

interface ReviewFlow
{
    public function type(): ReviewFlowType;

    /**
     * Base query (team-scoped, criteria-filtered) for items that still need review,
     * excluding anything the user has snoozed.
     */
    public function query(Team $team, User $user): Builder;

    /**
     * Action buttons available while reviewing an item in this flow.
     *
     * @return array<int, ReviewAction>
     */
    public function actions(): array;

    /**
     * Map a single model into the card payload sent to the frontend.
     *
     * @return array<string, mixed>
     */
    public function mapItem(Model $item): array;
}

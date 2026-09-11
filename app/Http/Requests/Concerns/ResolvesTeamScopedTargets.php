<?php

declare(strict_types=1);

namespace App\Http\Requests\Concerns;

use App\Models\Party;
use App\Models\Project;
use App\Models\WorkOrder;
use Closure;
use Illuminate\Database\Eloquent\Builder;

/**
 * Shared resolution of the projects and work orders a request may point at.
 *
 * A plain `exists` rule expresses neither team scope nor project privacy, and the
 * rows being created carry the current team's id — so an unscoped parent would
 * produce a record whose team and parent disagree. Every write surface (web, API,
 * MCP, quick capture) has to apply the same scope, so it lives in one place.
 */
trait ResolvesTeamScopedTargets
{
    public function teamId(): int
    {
        return (int) ($this->user()?->currentTeam?->id ?? 0);
    }

    /**
     * @return Builder<Project>
     */
    protected function visibleProjects(): Builder
    {
        return Project::query()
            ->forTeam($this->teamId())
            ->visibleTo((int) $this->user()->id);
    }

    /**
     * @return Builder<WorkOrder>
     */
    protected function visibleWorkOrders(): Builder
    {
        return WorkOrder::query()
            ->forTeam($this->teamId())
            ->visibleTo((int) $this->user()->id);
    }

    protected function visibleProjectRule(): Closure
    {
        return function (string $attribute, mixed $value, Closure $fail): void {
            if (! $this->visibleProjects()->whereKey($value)->exists()) {
                $fail('The selected project is invalid.');
            }
        };
    }

    protected function visibleWorkOrderRule(): Closure
    {
        return function (string $attribute, mixed $value, Closure $fail): void {
            if (! $this->visibleWorkOrders()->whereKey($value)->exists()) {
                $fail('The selected work order is invalid.');
            }
        };
    }

    /**
     * Parties carry no per-user visibility, only team scope.
     */
    protected function teamPartyRule(): Closure
    {
        return function (string $attribute, mixed $value, Closure $fail): void {
            $inTeam = Party::query()
                ->forTeam($this->teamId())
                ->whereKey($value)
                ->exists();

            if (! $inTeam) {
                $fail('The selected client is invalid.');
            }
        };
    }
}

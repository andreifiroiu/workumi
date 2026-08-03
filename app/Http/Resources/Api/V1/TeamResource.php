<?php

declare(strict_types=1);

namespace App\Http\Resources\Api\V1;

use App\Models\Team;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Team
 */
class TeamResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'owner_id' => $this->user_id,
            'role' => $this->roleFor($request->user()?->id),
            'created_at' => $this->created_at?->toISOString(),
        ];
    }

    /**
     * Ownership lives on teams.user_id; every other role comes from the
     * team_user pivot, so it can only be reported when `users` is loaded.
     */
    private function roleFor(?int $userId): ?string
    {
        if ($userId === null) {
            return null;
        }

        if ($this->user_id === $userId) {
            return 'owner';
        }

        if (! $this->relationLoaded('users')) {
            return null;
        }

        return $this->users->firstWhere('id', $userId)?->membership?->role?->code ?? 'member';
    }
}

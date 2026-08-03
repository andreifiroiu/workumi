<?php

declare(strict_types=1);

namespace App\Rules;

use App\Models\Team;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Translation\PotentiallyTranslatedString;

/**
 * Validates that a user id belongs to the given team.
 *
 * Membership must be resolved through the team's allUsers() collection rather than an
 * `exists:team_user` rule: User::createTeam() deliberately leaves the owner out of the pivot, so a
 * pivot-only check would reject the team owner. Reuse a single instance across an array of ids —
 * the underlying relation is cached on the team, so repeated checks cost no extra queries.
 */
class BelongsToTeam implements ValidationRule
{
    public function __construct(private readonly ?Team $team) {}

    /**
     * Run the validation rule.
     *
     * @param  Closure(string, ?string=): PotentiallyTranslatedString  $fail
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! $this->team || ! $this->team->allUsers()->contains('id', (int) $value)) {
            $fail('The selected user is not a member of your team.');
        }
    }
}

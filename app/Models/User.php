<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Jurager\Teams\Traits\HasTeams;
use Laravel\Fortify\TwoFactorAuthenticatable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, HasTeams, Notifiable, TwoFactorAuthenticatable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'timezone',
        'language',
        'current_team_id',
        'role',
        'capacity_hours_per_week',
        'current_workload_hours',
        'daily_digest_hour',
        'last_digest_sent_on',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'two_factor_secret',
        'two_factor_recovery_codes',
        'remember_token',
    ];

    /**
     * Memoized team role checks, keyed by "{teamId}:{tier}".
     *
     * @var array<string, bool>
     */
    private array $teamRoleMemo = [];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'two_factor_confirmed_at' => 'datetime',
            'daily_digest_hour' => 'integer',
            'last_digest_sent_on' => 'date',
        ];
    }

    /**
     * Get the user's current team.
     */
    public function currentTeam()
    {
        return $this->belongsTo(Team::class, 'current_team_id');
    }

    /**
     * Switch the user's current team.
     */
    public function switchTeam(Team $team): void
    {
        if (! $this->belongsToTeam($team)) {
            throw new \Exception('User does not belong to this team.');
        }

        $this->forceFill([
            'current_team_id' => $team->id,
        ])->save();
    }

    /**
     * Get the user's current team or first team if no current team is set.
     */
    public function getCurrentTeamAttribute()
    {
        if ($this->current_team_id) {
            // Use the relationship method directly to avoid circular reference
            return $this->currentTeam()->first();
        }

        return $this->allTeams()->first();
    }

    /**
     * Determine whether the user may administer the given team.
     *
     * The admin surface is the team owner plus any member holding the `admin`
     * role. The owner is deliberately absent from the `team_user` pivot (see
     * createTeam() below), so ownsTeam() must be consulted alongside the role.
     */
    public function canAdministerTeam(?object $team = null): bool
    {
        $team ??= $this->currentTeam;

        if (! $team) {
            return false;
        }

        return $this->rememberTeamRoleCheck($team->id, 'admin', function () use ($team): bool {
            return $this->ownsTeam($team) || $this->hasTeamRole($team, 'admin');
        });
    }

    /**
     * Determine whether the user may create or modify team content.
     *
     * Uses a positive allow-list rather than negating the `viewer` role:
     * hasTeamRole() returns true unconditionally for the team owner, so the
     * negated form would lock the owner out of every write. The allow-list is
     * also fail-closed when the pivot or role row is missing.
     */
    public function canWriteTeamContent(?object $team = null): bool
    {
        $team ??= $this->currentTeam;

        if (! $team) {
            return false;
        }

        return $this->rememberTeamRoleCheck($team->id, 'write', function () use ($team): bool {
            return $this->hasTeamRole($team, ['admin', 'member']);
        });
    }

    /**
     * Memoize a role check for the lifetime of the instance.
     *
     * hasTeamRole() costs roughly three queries and is not cached by the
     * package, while policies re-run these checks on every authorize() call.
     *
     * @param  \Closure(): bool  $check
     */
    private function rememberTeamRoleCheck(int|string $teamId, string $tier, \Closure $check): bool
    {
        return $this->teamRoleMemo["{$teamId}:{$tier}"] ??= $check();
    }

    /**
     * Create a new team owned by the user.
     */
    public function createTeam(array $attributes): Team
    {
        $team = Team::create([
            ...$attributes,
            'user_id' => $this->id,
        ]);

        // Note: Owner is not added to team_user pivot table to avoid conflicts
        // The package's allUsers() method includes the owner separately
        // Users should call $team->addUser($otherUser, 'member') for non-owners

        return $team;
    }

    /**
     * Get the user's skills.
     */
    public function skills(): HasMany
    {
        return $this->hasMany(UserSkill::class);
    }

    /**
     * Get the user's hourly rates (team default rates).
     */
    public function rates(): HasMany
    {
        return $this->hasMany(UserRate::class);
    }

    /**
     * Get the user's project-specific rate overrides.
     */
    public function projectRates(): HasMany
    {
        return $this->hasMany(ProjectUserRate::class);
    }

    /**
     * Get the user's available capacity in hours per week.
     */
    public function getAvailableCapacity(): int
    {
        return ($this->capacity_hours_per_week ?? 40) - ($this->current_workload_hours ?? 0);
    }
}

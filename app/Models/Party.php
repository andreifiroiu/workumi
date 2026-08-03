<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\PartyType;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Notifications\Notifiable;

class Party extends Model
{
    use HasFactory, Notifiable, SoftDeletes;

    protected $fillable = [
        'team_id',
        'name',
        'type',
        'contact_name',
        'contact_email',
        'email',
        'phone',
        'website',
        'address',
        'notes',
        'tags',
        'status',
        'primary_contact_id',
        'last_activity',
        'preferred_language',
    ];

    protected $casts = [
        'type' => PartyType::class,
        'tags' => 'array',
        'last_activity' => 'datetime',
    ];

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    public function projects(): HasMany
    {
        return $this->hasMany(Project::class);
    }

    public function contacts(): HasMany
    {
        return $this->hasMany(Contact::class);
    }

    public function primaryContact(): BelongsTo
    {
        return $this->belongsTo(Contact::class, 'primary_contact_id');
    }

    public function scopeForTeam(Builder $query, int $teamId): Builder
    {
        return $query->where('team_id', $teamId);
    }

    /**
     * @param  list<int>  $teamIds
     */
    public function scopeForTeams(Builder $query, array $teamIds): Builder
    {
        return $query->whereIn('team_id', $teamIds);
    }

    public function scopeOfType(Builder $query, PartyType $type): Builder
    {
        return $query->where('type', $type->value);
    }

    /**
     * Get the party's preferred language, defaulting to English.
     */
    public function getPreferredLanguageAttribute(?string $value): string
    {
        return $value ?? 'en';
    }

    /**
     * Route notifications for the mail channel.
     *
     * Returns the contact_email if available, falls back to email field,
     * or the primary Contact's email. Returns null if no email is available,
     * which will skip the mail channel for this notification.
     */
    public function routeNotificationForMail(): ?string
    {
        // First priority: contact_email field
        if ($this->contact_email !== null && $this->contact_email !== '') {
            return $this->contact_email;
        }

        // Second priority: email field
        if ($this->email !== null && $this->email !== '') {
            return $this->email;
        }

        // Third priority: primary contact's email
        $primaryContact = $this->primaryContact;
        if ($primaryContact !== null && $primaryContact->email !== null) {
            return $primaryContact->email;
        }

        // No email available - notification will skip mail channel
        return null;
    }
}

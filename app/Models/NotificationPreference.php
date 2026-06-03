<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class NotificationPreference extends Model
{
    protected $fillable = [
        'team_id',
        'user_id',
        'email_project_updates',
        'email_task_assignments',
        'email_approval_requests',
        'email_blockers',
        'email_deadlines',
        'email_weekly_digest',
        'email_agent_activity',
        'email_daily_digest',
        'push_project_updates',
        'push_task_assignments',
        'push_approval_requests',
        'push_blockers',
        'push_deadlines',
        'push_weekly_digest',
        'push_agent_activity',
        'push_daily_digest',
        'slack_project_updates',
        'slack_task_assignments',
        'slack_approval_requests',
        'slack_blockers',
        'slack_deadlines',
        'slack_weekly_digest',
        'slack_agent_activity',
        'slack_daily_digest',
    ];

    protected $casts = [
        'email_project_updates' => 'boolean',
        'email_task_assignments' => 'boolean',
        'email_approval_requests' => 'boolean',
        'email_blockers' => 'boolean',
        'email_deadlines' => 'boolean',
        'email_weekly_digest' => 'boolean',
        'email_agent_activity' => 'boolean',
        'email_daily_digest' => 'boolean',
        'push_project_updates' => 'boolean',
        'push_task_assignments' => 'boolean',
        'push_approval_requests' => 'boolean',
        'push_blockers' => 'boolean',
        'push_deadlines' => 'boolean',
        'push_weekly_digest' => 'boolean',
        'push_agent_activity' => 'boolean',
        'push_daily_digest' => 'boolean',
        'slack_project_updates' => 'boolean',
        'slack_task_assignments' => 'boolean',
        'slack_approval_requests' => 'boolean',
        'slack_blockers' => 'boolean',
        'slack_deadlines' => 'boolean',
        'slack_weekly_digest' => 'boolean',
        'slack_agent_activity' => 'boolean',
        'slack_daily_digest' => 'boolean',
    ];

    public function team()
    {
        return $this->belongsTo(Team::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public static function forUser(Team $team, User $user)
    {
        $preference = static::firstOrCreate([
            'team_id' => $team->id,
            'user_id' => $user->id,
        ]);

        // A freshly created row does not reflect the table's column defaults
        // in memory; reload it so callers see the real boolean values.
        if ($preference->wasRecentlyCreated) {
            $preference->refresh();
        }

        return $preference;
    }

    /**
     * The editable "{channel}_{type}" matrix fields, limited to channels and
     * types that are currently enabled in config/notifications.php.
     *
     * @return list<string>
     */
    public static function editableFields(): array
    {
        $fields = [];

        foreach (config('notifications.channels') as $channelKey => $channel) {
            if (! ($channel['enabled'] ?? false)) {
                continue;
            }

            foreach (config('notifications.types') as $typeKey => $type) {
                if (! ($type['enabled'] ?? false)) {
                    continue;
                }

                $fields[] = "{$channelKey}_{$typeKey}";
            }
        }

        return $fields;
    }
}

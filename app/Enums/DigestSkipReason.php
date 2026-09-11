<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Why a user did not receive the daily task digest on a given run.
 *
 * Every user the digest command evaluates ends up either sent or attached to
 * exactly one of these reasons, so the run summary in the digest log always
 * accounts for the full population.
 */
enum DigestSkipReason: string
{
    case OutsideDigestHour = 'outside_digest_hour';
    case AlreadySentToday = 'already_sent_today';
    case NoCurrentTeam = 'no_current_team';
    case TeamDigestDisabled = 'team_digest_disabled';
    case UserPreferenceOff = 'user_preference_off';
    case NothingDue = 'nothing_due';
    case SendFailed = 'send_failed';
    case MarkerWriteFailed = 'marker_write_failed';

    public function label(): string
    {
        return match ($this) {
            self::OutsideDigestHour => 'Not the user\'s local digest hour',
            self::AlreadySentToday => 'Already sent a digest today',
            self::NoCurrentTeam => 'User has no current team',
            self::TeamDigestDisabled => 'Team has the daily task digest turned off',
            self::UserPreferenceOff => 'User turned off the daily digest email',
            self::NothingDue => 'Nothing due or overdue',
            self::SendFailed => 'Queueing the digest threw an exception',
            self::MarkerWriteFailed => 'Digest was queued but the sent-today marker could not be saved',
        };
    }
}

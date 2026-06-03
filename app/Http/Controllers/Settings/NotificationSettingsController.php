<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\NotificationSettingsUpdateRequest;
use App\Models\NotificationPreference;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Inertia\Inertia;
use Inertia\Response;

class NotificationSettingsController extends Controller
{
    /**
     * Show the user's notification settings page.
     */
    public function edit(Request $request): Response
    {
        $user = $request->user();
        $prefs = NotificationPreference::forUser($user->currentTeam, $user);

        $channels = collect(config('notifications.channels'))
            ->map(fn (array $channel, string $key): array => [
                'key' => $key,
                'label' => $channel['label'],
                'enabled' => $channel['enabled'],
            ])
            ->values();

        $types = collect(config('notifications.types'))
            ->filter(fn (array $type): bool => $type['enabled'])
            ->map(fn (array $type, string $key): array => [
                'key' => $key,
                'label' => $type['label'],
                'description' => $type['description'],
            ])
            ->values();

        $preferences = $types->mapWithKeys(fn (array $type): array => [
            $type['key'] => $channels
                ->mapWithKeys(fn (array $channel): array => [
                    $channel['key'] => (bool) $prefs->{"{$channel['key']}_{$type['key']}"},
                ])
                ->all(),
        ]);

        return Inertia::render('account/notifications', [
            'dailyDigestHour' => $user->daily_digest_hour,
            'channels' => $channels,
            'types' => $types,
            'preferences' => $preferences,
        ]);
    }

    /**
     * Update the user's notification settings.
     */
    public function update(NotificationSettingsUpdateRequest $request): RedirectResponse
    {
        $user = $request->user();
        $validated = $request->validated();

        $user->update(['daily_digest_hour' => $validated['daily_digest_hour']]);

        NotificationPreference::forUser($user->currentTeam, $user)
            ->update(Arr::only($validated, NotificationPreference::editableFields()));

        return to_route('account.notifications.edit');
    }
}

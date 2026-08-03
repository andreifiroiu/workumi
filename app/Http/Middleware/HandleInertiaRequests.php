<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Models\TimeEntry;
use Illuminate\Foundation\Inspiring;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        [$message, $author] = str(Inspiring::quotes()->random())->explode('-');

        $user = $request->user();
        $currentTeam = $user?->currentTeam;

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'quote' => ['message' => trim($message), 'author' => trim($author)],
            'locale' => app()->getLocale(),
            'availableLocales' => config('app.available_locales'),
            'auth' => [
                'user' => $user ? [
                    ...$user->toArray(),
                    'timezone' => $user->timezone ?? 'UTC',
                    'language' => $user->language ?? 'en',
                ] : null,
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',

            // Real organization/team data
            'currentOrganization' => $currentTeam ? $this->organizationPayload($currentTeam) : null,

            'organizations' => $user
                ? $user->allTeams()->map(fn ($team) => $this->organizationPayload($team))->values()->all()
                : [],

            'activeTimer' => fn () => $this->getActiveTimer($request),
        ];
    }

    /**
     * Serialize a team for the frontend organization switcher.
     *
     * @return array<string, mixed>
     */
    private function organizationPayload(object $team): array
    {
        return [
            'id' => $team->id,
            'name' => $team->name,
            'slug' => $team->slug ?? 'team-'.$team->id,
            'user_id' => $team->user_id,
            'created_at' => $team->created_at?->toISOString(),
            'updated_at' => $team->updated_at?->toISOString(),
        ];
    }

    /**
     * Get the active timer for the current user with brief caching.
     *
     * @return array<string, mixed>|null
     */
    private function getActiveTimer(Request $request): ?array
    {
        $user = $request->user();

        if (! $user) {
            return null;
        }

        $cacheKey = "active_timer_user_{$user->id}";

        return Cache::remember($cacheKey, 5, function () use ($user) {
            $runningTimer = TimeEntry::runningForUser($user->id)
                ->with(['task.workOrder.project'])
                ->first();

            if (! $runningTimer) {
                return null;
            }

            return [
                'id' => $runningTimer->id,
                'taskId' => $runningTimer->task_id,
                'taskTitle' => $runningTimer->task?->title ?? '',
                'projectName' => $runningTimer->task?->workOrder?->project?->name ?? '',
                'startedAt' => $runningTimer->started_at?->toISOString(),
                'isBillable' => $runningTimer->is_billable,
            ];
        });
    }
}

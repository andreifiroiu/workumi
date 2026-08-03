<?php

use App\Http\Middleware\EnsureTeamAdmin;
use App\Http\Middleware\EnsureUserHasTeam;
use App\Http\Middleware\HandleAppearance;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\SetLocale;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        apiPrefix: 'api',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->encryptCookies(except: ['appearance', 'sidebar_state', 'language']);

        // The `api` group only gets a throttle when a limiter is named; the
        // limiter itself is defined in AppServiceProvider.
        $middleware->throttleApi();

        $middleware->validateCsrfTokens(except: ['/mcp', 'webhooks/mailgun/inbound']);

        $middleware->web(append: [
            SetLocale::class,
            HandleAppearance::class,
            // Must run before HandleInertiaRequests: Inertia computes shared props before calling
            // the next middleware, so a team repaired afterwards would not reach the current response.
            EnsureUserHasTeam::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);

        $middleware->alias([
            'team.admin' => EnsureTeamAdmin::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // API clients get JSON even without an Accept header; otherwise a failed
        // validation redirects (302) and a missing record renders HTML.
        $exceptions->shouldRenderJsonWhen(
            fn ($request, $throwable) => $request->is('api/*') || $request->expectsJson()
        );
    })->create();

<?php

use App\Models\User;
use App\Services\Seo\RobotsTxt;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Str;

beforeEach(function () {
    $this->withoutVite();
    config(['app.url' => 'https://workumi.com']);
});

/**
 * Every GET route that is not a public marketing page must be covered by a
 * noindex pattern.
 *
 * This walks the router rather than a hand-written list on purpose. A dataset
 * copied out of config/seo.php only asserts that the config matches itself, and
 * that is how `account/*`, `shared/{token}` and `storage/{path}` were missed:
 * the patterns were written against route names that no longer existed. A new
 * route now fails this test until it is classified either way.
 */
it('covers every non-public GET route with a noindex pattern', function () {
    /** @var array<int, string> $patterns */
    $patterns = config('seo.noindex_paths');

    $indexable = array_map(
        fn (string $path): string => trim($path, '/'),
        array_values(config('seo.pages'))
    );

    // Served deliberately to crawlers, and the locale-prefixed aliases of the
    // marketing pages, which carry their own canonical and hreflang instead.
    $alwaysAllowed = ['robots.txt', 'sitemap.xml', 'en/{path?}', '{fallbackPlaceholder}'];

    $uncovered = [];

    foreach (Route::getRoutes() as $route) {
        if (! in_array('GET', $route->methods(), true)) {
            continue;
        }

        $uri = trim($route->uri(), '/');
        $uri = $uri === '' ? '' : $uri;

        if (in_array($uri, $indexable, true) || in_array($uri, $alwaysAllowed, true)) {
            continue;
        }

        if (Str::startsWith($uri, '_ignition') || Str::startsWith($uri, '_debugbar')) {
            continue;
        }

        // Request::is() matches a concrete path, so stand the parameters up as
        // literal segments before testing the patterns against them.
        $concrete = (string) preg_replace('/\{[^}]+\?}/', 'x', $uri);
        $concrete = trim((string) preg_replace('/\{[^}]+}/', 'x', $concrete), '/');

        if (! Str::is($patterns, $concrete)) {
            $uncovered[] = $route->uri();
        }
    }

    expect(array_values(array_unique($uncovered)))->toBe(
        [],
        'these GET routes are neither public pages nor covered by seo.noindex_paths'
    );
});

it('disallows in robots.txt everything it marks noindex', function () {
    config(['seo.robots.public_hosts' => ['workumi.com']]);

    $body = app(RobotsTxt::class)->body();

    /** @var array<int, string> $patterns */
    $patterns = config('seo.noindex_paths');

    $missing = [];

    foreach ($patterns as $pattern) {
        $prefix = '/'.rtrim(str_replace('*', '', $pattern), '/');

        if (! str_contains($body, 'Disallow: '.$prefix)) {
            $missing[] = $pattern;
        }
    }

    expect($missing)->toBe([], 'noindex patterns with no matching robots.txt Disallow line');
});

it('marks the authenticated app noindex', function (string $path) {
    $user = createTeamOwner();

    $this->actingAs($user)
        ->get($path)
        ->assertHeader('X-Robots-Tag', 'noindex, nofollow');
})->with(['/today', '/directory', '/documents', '/playbooks', '/reports', '/account/profile', '/folders']);

it('marks the token-shared document routes noindex, which are not auth-gated', function (string $path) {
    $this->get($path)->assertHeader('X-Robots-Tag', 'noindex, nofollow');
})->with(['/shared/some-token', '/shared/some-token/download', '/storage/some/file.pdf']);

it('marks the auth pages noindex', function (string $path) {
    $this->get($path)->assertHeader('X-Robots-Tag', 'noindex, nofollow');
})->with(['/login', '/register', '/forgot-password', '/email/verify']);

it('marks a redirect to login noindex too', function () {
    $response = $this->get('/today');

    $response->assertRedirect();
    $response->assertHeader('X-Robots-Tag', 'noindex, nofollow');
});

it('leaves the public pages indexable', function (string $path) {
    $this->get($path)->assertHeaderMissing('X-Robots-Tag');
})->with(['/', '/es', '/use-cases/agencies', '/de/use-cases/operations', '/robots.txt', '/sitemap.xml']);

it('does not mark the public pages noindex for a signed-in visitor', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->get('/')->assertHeaderMissing('X-Robots-Tag');
});

<?php

use App\Services\Seo\PageSeo;
use App\Services\Seo\PublicUrls;

beforeEach(function () {
    $this->withoutVite();
    config(['app.url' => 'https://workumi.com']);
});

it('emits a self-referencing canonical on every public URL', function (string $path, string $canonical) {
    $this->get($path)->assertSee('<link rel="canonical" href="'.$canonical.'">', escape: false);
})->with([
    ['/', 'https://workumi.com/'],
    ['/es', 'https://workumi.com/es'],
    ['/use-cases/agencies', 'https://workumi.com/use-cases/agencies'],
    ['/de/use-cases/operations', 'https://workumi.com/de/use-cases/operations'],
]);

it('builds canonicals from app.url, not from the host the request arrived on', function () {
    $this->get('http://evil.example.com/use-cases/agencies')
        ->assertSee('<link rel="canonical" href="https://workumi.com/use-cases/agencies">', escape: false);
});

it('lists every locale plus x-default as hreflang alternates', function () {
    $response = $this->get('/es/use-cases/agencies');

    foreach ([
        'en' => 'https://workumi.com/use-cases/agencies',
        'es' => 'https://workumi.com/es/use-cases/agencies',
        'fr' => 'https://workumi.com/fr/use-cases/agencies',
        'de' => 'https://workumi.com/de/use-cases/agencies',
        'ro' => 'https://workumi.com/ro/use-cases/agencies',
    ] as $locale => $url) {
        $response->assertSee('<link rel="alternate" hreflang="'.$locale.'" href="'.$url.'">', escape: false);
    }

    $response->assertSee(
        '<link rel="alternate" hreflang="x-default" href="https://workumi.com/use-cases/agencies">',
        escape: false
    );
});

it('makes every hreflang set reciprocal in the rendered HTML', function () {
    $urls = app(PublicUrls::class);

    foreach (array_keys($urls->pages()) as $page) {
        $group = array_values($urls->alternates($page));

        foreach ($group as $url) {
            $path = (string) parse_url($url, PHP_URL_PATH);

            // Parsed out of the served page, not read back off the service that
            // generated it: comparing PageSeo's output against PublicUrls' own
            // alternates() would pass even if both were pointing at the wrong
            // host, since it is the same call on both sides.
            preg_match_all(
                '#<link rel="alternate" hreflang="([a-z-]+)" href="([^"]+)">#',
                $this->get($path)->getContent(),
                $matches,
                PREG_SET_ORDER
            );

            $rendered = [];

            foreach ($matches as $match) {
                $rendered[$match[1]] = $match[2];
            }

            $defaultLocaleUrl = $urls->url($page, $urls->defaultLocale());

            expect(array_values(array_diff_key($rendered, ['x-default' => null])))
                ->toEqualCanonicalizing($group, "hreflang set rendered at {$url} does not match the {$page} group")
                ->and($rendered['x-default'] ?? null)->toBe($defaultLocaleUrl)
                // Reciprocity: this URL must appear in its own alternate set.
                ->and(in_array($url, $rendered, true))
                ->toBeTrue("{$url} does not list itself among its alternates");
        }
    }
});

it('gives every page in every locale a distinct title and description', function () {
    $urls = app(PublicUrls::class);
    $seo = app(PageSeo::class);

    $titles = [];
    $descriptions = [];

    foreach (array_keys($urls->pages()) as $page) {
        foreach ($urls->locales() as $locale) {
            $meta = $seo->forPath(trim($urls->path($page, $locale), '/'));

            expect($meta)->not->toBeNull();
            expect(trim($meta->title))->not->toBe('');
            expect(trim($meta->description))->not->toBe('');

            $titles[] = $meta->title;
            $descriptions[] = $meta->description;
        }
    }

    expect($titles)->toHaveCount(count(array_unique($titles)))
        ->and($descriptions)->toHaveCount(count(array_unique($descriptions)));
});

it('carries no HTML entities into titles or descriptions', function () {
    $urls = app(PublicUrls::class);
    $seo = app(PageSeo::class);

    foreach (array_keys($urls->pages()) as $page) {
        foreach ($urls->locales() as $locale) {
            $meta = $seo->forPath(trim($urls->path($page, $locale), '/'));

            // Blade escapes these, so an entity in the source renders literally.
            expect($meta->title)->not->toMatch('/&[a-z]+;|&#\d+;/i')
                ->and($meta->description)->not->toMatch('/&[a-z]+;|&#\d+;/i');
        }
    }
});

it('emits absolute Open Graph and Twitter metadata', function () {
    $this->get('/fr')
        ->assertSee('<meta property="og:url" content="https://workumi.com/fr">', escape: false)
        ->assertSee('<meta property="og:image" content="https://workumi.com/images/og-default.png">', escape: false)
        ->assertSee('<meta property="og:locale" content="fr_FR">', escape: false)
        ->assertSee('<meta property="og:locale:alternate" content="en_US">', escape: false)
        ->assertSee('<meta property="og:type" content="website">', escape: false)
        ->assertSee('<meta name="twitter:card" content="summary_large_image">', escape: false)
        ->assertSee('<meta name="twitter:image" content="https://workumi.com/images/og-default.png">', escape: false);
});

it('falls back to the default locale when a translation is blank', function () {
    app('translator')->addLines(['public.agencies.title' => '   '], 'ro');

    $meta = app(PageSeo::class)->forPath('ro/use-cases/agencies');

    expect($meta->title)->toBe(trans('public.agencies.title', [], 'en'));
});

it('returns no metadata for a path that is not a public page', function () {
    expect(app(PageSeo::class)->forPath('today'))->toBeNull();
});

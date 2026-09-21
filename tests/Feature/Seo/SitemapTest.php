<?php

use App\Services\Seo\SitemapService;
use Illuminate\Support\Facades\Cache;

beforeEach(function () {
    $this->withoutVite();
    config(['app.url' => 'https://workumi.com']);
});

it('serves the sitemap as XML', function () {
    $this->get('/sitemap.xml')
        ->assertOk()
        ->assertHeader('Content-Type', 'application/xml; charset=UTF-8');
});

it('lists every page in every locale', function () {
    $xml = simplexml_load_string(app(SitemapService::class)->generate());

    $locations = [];

    foreach ($xml->url as $url) {
        $locations[] = (string) $url->loc;
    }

    expect($locations)->toEqualCanonicalizing([
        'https://workumi.com/',
        'https://workumi.com/es',
        'https://workumi.com/fr',
        'https://workumi.com/de',
        'https://workumi.com/ro',
        'https://workumi.com/use-cases/agencies',
        'https://workumi.com/es/use-cases/agencies',
        'https://workumi.com/fr/use-cases/agencies',
        'https://workumi.com/de/use-cases/agencies',
        'https://workumi.com/ro/use-cases/agencies',
        'https://workumi.com/use-cases/consultancies',
        'https://workumi.com/es/use-cases/consultancies',
        'https://workumi.com/fr/use-cases/consultancies',
        'https://workumi.com/de/use-cases/consultancies',
        'https://workumi.com/ro/use-cases/consultancies',
        'https://workumi.com/use-cases/operations',
        'https://workumi.com/es/use-cases/operations',
        'https://workumi.com/fr/use-cases/operations',
        'https://workumi.com/de/use-cases/operations',
        'https://workumi.com/ro/use-cases/operations',
    ]);
});

it('advertises no URL that does not return 200', function () {
    foreach (app(SitemapService::class)->urls() as $url) {
        $path = (string) parse_url($url, PHP_URL_PATH);

        expect($this->get($path)->getStatusCode())
            ->toBe(200, "sitemap advertises {$url}, which does not return 200");
    }
});

it('gives every URL a reciprocal set of alternates plus x-default', function () {
    $xml = simplexml_load_string(app(SitemapService::class)->generate());

    foreach ($xml->url as $url) {
        $alternates = [];

        foreach ($url->children('xhtml', true)->link as $link) {
            $alternates[(string) $link->attributes()->hreflang] = (string) $link->attributes()->href;
        }

        expect(array_keys($alternates))->toEqualCanonicalizing(['en', 'es', 'fr', 'de', 'ro', 'x-default'])
            ->and($alternates)->toContain((string) $url->loc)
            ->and($alternates['x-default'])->toBe($alternates['en']);
    }
});

it('declares the sitemap and xhtml namespaces', function () {
    $sitemap = app(SitemapService::class)->generate();

    expect($sitemap)
        ->toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"')
        ->toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"');
});

it('caches the generated sitemap', function () {
    $this->get('/sitemap.xml')->assertOk();

    expect(Cache::has(app(SitemapService::class)->cacheKey()))->toBeTrue();
});

it('does not serve a sitemap built for a different site root', function () {
    $this->get('/sitemap.xml')->assertSee('https://workumi.com/', escape: false);

    // The cache key is fingerprinted with its inputs, so correcting APP_URL is
    // itself the invalidation rather than something to wait an hour for.
    config(['app.url' => 'https://www.workumi.com']);

    $this->get('/sitemap.xml')
        ->assertSee('https://www.workumi.com/', escape: false)
        ->assertDontSee('<loc>https://workumi.com/</loc>', escape: false);
});

it('refuses to advertise an empty sitemap', function () {
    // An empty <urlset> tells a crawler the site has no pages at all, so a
    // stale config cache must fail loudly instead of returning 200.
    config(['seo.pages' => []]);

    expect(fn () => app(SitemapService::class)->generate())
        ->toThrow(RuntimeException::class);
});

it('is listed in robots.txt', function () {
    config(['seo.robots.public_hosts' => ['workumi.com']]);

    $this->get('/robots.txt')->assertSee('Sitemap: https://workumi.com/sitemap.xml');
});

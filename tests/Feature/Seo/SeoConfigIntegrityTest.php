<?php

use App\Services\Seo\PublicUrls;

/**
 * Guards against the SEO config drifting away from the rest of the app.
 *
 * The other SEO tests all iterate config('seo.pages'), which makes them
 * circular: a page missing from that config is missing from the loop too, so
 * it passes every assertion while rendering with no canonical, no hreflang, no
 * structured data and no sitemap entry. These tests read the filesystem and
 * the translation files instead.
 */
it('lists every Folio page in seo.pages', function () {
    $pagesDirectory = resource_path('views/pages');

    $onDisk = [];

    foreach (glob($pagesDirectory.'/{,*/,*/*/}*.blade.php', GLOB_BRACE) as $file) {
        $relative = str_replace([$pagesDirectory.'/', '.blade.php'], '', $file);

        $onDisk[] = $relative === 'index' ? '' : $relative;
    }

    $configured = array_values(config('seo.pages'));

    expect(array_diff($onDisk, $configured))->toBe(
        [],
        'a page exists in resources/views/pages but is missing from config/seo.php, '
        .'so it renders with no canonical, no hreflang and no sitemap entry'
    );
});

it('serves every page named in seo.pages', function () {
    $urls = app(PublicUrls::class);

    foreach (array_keys($urls->pages()) as $page) {
        $path = $urls->path($page, $urls->defaultLocale());

        expect($this->withoutVite()->get($path)->getStatusCode())
            ->toBe(200, "seo.pages advertises {$path}, which does not exist");
    }
});

it('keeps the home key, which the layout depends on unconditionally', function () {
    // SeoServiceProvider calls path('home', …) on every public render, so
    // renaming this key 500s the whole marketing site.
    expect(config('seo.pages'))->toHaveKey('home');
});

it('has a translated title and description for every page in every locale', function () {
    $urls = app(PublicUrls::class);

    $missing = [];

    foreach (array_keys($urls->pages()) as $page) {
        foreach ($urls->locales() as $locale) {
            foreach (['title', 'description'] as $key) {
                $line = "public.{$page}.{$key}";

                // trans() without PageSeo's fallback chain: the fallback would
                // hide a typo'd key behind the English copy, and the page would
                // then serve English metadata under hreflang="es".
                $value = trans($line, [], $locale);

                if (! is_string($value) || $value === $line || trim($value) === '') {
                    $missing[] = "{$locale}: {$line}";
                }
            }
        }
    }

    expect($missing)->toBe([]);
});

it('keeps the noindex patterns and robots policy populated', function () {
    // Each of these degrades to a silent no-op when empty: no noindex headers,
    // and a robots.txt with no Disallow lines at all.
    expect(config('seo.noindex_paths'))->not->toBeEmpty()
        ->and(config('seo.robots.disallow'))->not->toBeEmpty()
        ->and(config('seo.robots.public_hosts'))->not->toBeEmpty();
});

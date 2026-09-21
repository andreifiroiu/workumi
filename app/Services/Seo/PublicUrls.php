<?php

namespace App\Services\Seo;

use Illuminate\Support\Str;

/**
 * The public URL map: which marketing pages exist, and what each one's URL is
 * in each locale.
 *
 * The sitemap, the hreflang alternates, the canonical tags and the language
 * switcher all resolve URLs through this class, so none of them can describe a
 * different set of pages than the others.
 *
 * URLs are built from `app.url` rather than the incoming request, so a request
 * arriving on an unexpected host cannot emit a canonical pointing at itself.
 */
class PublicUrls
{
    /**
     * The marketing pages, keyed by page name.
     *
     * @return array<string, string>
     */
    public function pages(): array
    {
        /** @var array<string, string> $pages */
        $pages = config('seo.pages', []);

        return $pages;
    }

    /**
     * The locale served without a URL prefix.
     *
     * Deliberately not `app.locale`: Application::setLocale() writes that key,
     * so during a request for /es it reads "es" and every URL this class built
     * would treat Spanish as the unprefixed language.
     */
    public function defaultLocale(): string
    {
        return (string) config('seo.default_locale', 'en');
    }

    /**
     * Every locale the public pages are served in, default first.
     *
     * @return array<int, string>
     */
    public function locales(): array
    {
        /** @var array<int, string> $available */
        $available = config('app.available_locales', ['en']);

        $default = $this->defaultLocale();

        return array_values(array_unique(array_merge(
            [$default],
            array_values(array_diff($available, [$default]))
        )));
    }

    /**
     * The locales that carry a URL prefix.
     *
     * @return array<int, string>
     */
    public function prefixedLocales(): array
    {
        return array_values(array_diff($this->locales(), [$this->defaultLocale()]));
    }

    /**
     * The root-relative path for a page in a locale, e.g. `/es/use-cases/agencies`.
     */
    public function path(string $page, string $locale): string
    {
        $pages = $this->pages();

        if (! array_key_exists($page, $pages)) {
            throw new \InvalidArgumentException("Unknown public page [{$page}].");
        }

        $prefix = $locale === $this->defaultLocale() ? '' : '/'.$locale;
        $path = trim($pages[$page], '/');

        return $path === '' ? ($prefix ?: '/') : $prefix.'/'.$path;
    }

    /**
     * The absolute URL for a page in a locale.
     */
    public function url(string $page, string $locale): string
    {
        return $this->baseUrl().$this->normalisedPath($this->path($page, $locale));
    }

    /**
     * Every locale's absolute URL for a page, keyed by locale.
     *
     * @return array<string, string>
     */
    public function alternates(string $page): array
    {
        $alternates = [];

        foreach ($this->locales() as $locale) {
            $alternates[$locale] = $this->url($page, $locale);
        }

        return $alternates;
    }

    /**
     * The page key a request path belongs to, or null if it is not a public page.
     */
    public function pageForPath(string $path): ?string
    {
        $remainder = $this->stripLocale($path);

        foreach ($this->pages() as $page => $pagePath) {
            if ($remainder === trim($pagePath, '/')) {
                return $page;
            }
        }

        return null;
    }

    /**
     * The locale a request path is served in.
     *
     * Falls back to the default locale, which is also the answer for the
     * unprefixed pages.
     *
     * The segment is lowercased because Folio matches its mounts
     * case-insensitively: without this, /ES is served by the /es mount but
     * resolves here to the default locale, and the page renders in the wrong
     * language with no metadata at all.
     */
    public function localeForPath(string $path): string
    {
        $segment = Str::lower((string) Str::of($path)->trim('/')->explode('/')->first());

        return in_array($segment, $this->prefixedLocales(), true)
            ? $segment
            : $this->defaultLocale();
    }

    /**
     * The one URL path this request's page should be served at, or null when
     * the path is not a public page at all.
     *
     * Folio is more permissive than the URL map: it lowercases the path before
     * matching a mount (so /ES is served by the /es mount) and serves
     * `index.blade.php` at `/index` as well as at `/`. Each of those is a
     * crawlable duplicate of a real page. Callers compare this against the
     * incoming path and redirect when they differ, so there is exactly one
     * indexable URL per page per locale.
     *
     * Page names below the prefix are looked up on disk and so are only
     * case-insensitive where the filesystem is; a mis-cased page name 404s on
     * Linux, which needs no canonicalising.
     */
    public function canonicalPathFor(string $path): ?string
    {
        $normalised = Str::lower(trim($path, '/'));

        // `/index` and `/es/index` are Folio's other name for the home page.
        if ($normalised === 'index' || Str::endsWith($normalised, '/index')) {
            $normalised = trim(Str::beforeLast($normalised, 'index'), '/');
        }

        $page = $this->pageForPath($normalised);

        if ($page === null) {
            return null;
        }

        return $this->path($page, $this->localeForPath($normalised));
    }

    /**
     * The same page in another locale, or that locale's home page when the
     * path is not a public page.
     *
     * Used by the language switcher, which must land somewhere sensible even
     * when the visitor switches language from a page that has no counterpart.
     */
    public function translate(string $path, string $locale): string
    {
        $page = $this->pageForPath($path) ?? 'home';

        return $this->path($page, $locale);
    }

    /**
     * The site root, without a trailing slash.
     *
     * Throws rather than falling back to `url('/')`. That helper derives the
     * root from the request, which means the Host header: with a blank
     * APP_URL it would put whatever host a visitor sent into the canonical,
     * the hreflang set and the cached sitemap — the exact thing this class
     * promises not to do. A misconfigured site root is not recoverable here,
     * because every URL the class builds is derived from it.
     */
    public function baseUrl(): string
    {
        $configured = rtrim((string) config('app.url', ''), '/');

        if ($configured === '') {
            throw new \RuntimeException(
                'APP_URL is empty, so no canonical URL can be built. Set APP_URL to this host’s public root.'
            );
        }

        return $configured;
    }

    /**
     * Resolve a root-relative asset path against the site root.
     */
    public function asset(string $path): string
    {
        if (Str::startsWith($path, ['http://', 'https://'])) {
            return $path;
        }

        return $this->baseUrl().'/'.ltrim($path, '/');
    }

    /**
     * Drop the locale prefix from a request path, returning the remainder
     * without surrounding slashes.
     */
    protected function stripLocale(string $path): string
    {
        $path = trim($path, '/');
        $locale = $this->localeForPath($path);

        if ($locale === $this->defaultLocale()) {
            return $path;
        }

        return trim(substr($path, strlen($locale)), '/');
    }

    /**
     * The home page is `/`; every other path must not carry a trailing slash,
     * or the canonical and the sitemap disagree with the URL that is served.
     */
    protected function normalisedPath(string $path): string
    {
        return $path === '/' ? '/' : rtrim($path, '/');
    }
}

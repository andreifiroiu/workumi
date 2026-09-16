<?php

namespace App\Services\Seo;

/**
 * Resolves a request path to the metadata its <head> should carry.
 *
 * Copy comes from lang/{locale}/public.php under the page's own key, so a
 * translator editing a title changes what Google shows without touching PHP.
 *
 * Guarantees: the title and description are non-empty, and the canonical and
 * alternates are absolute URLs on `app.url`. It does not guarantee the page
 * exists — `forPath()` returns null for anything that is not a public page,
 * and the caller decides what that means.
 */
class PageSeo
{
    public function __construct(private readonly PublicUrls $urls) {}

    /**
     * Metadata for a request path, or null when the path is not a public page.
     */
    public function forPath(string $path): ?PageMetadata
    {
        $page = $this->urls->pageForPath($path);

        if ($page === null) {
            return null;
        }

        $locale = $this->urls->localeForPath($path);

        return new PageMetadata(
            page: $page,
            locale: $locale,
            defaultLocale: $this->urls->defaultLocale(),
            title: $this->title($page, $locale),
            description: $this->description($page, $locale),
            canonical: $this->urls->url($page, $locale),
            alternates: $this->urls->alternates($page),
            image: $this->urls->asset((string) config('seo.meta.image')),
            siteName: (string) config('seo.organization.name', config('app.name')),
        );
    }

    /**
     * The page title, falling back through the default locale to the site name.
     */
    protected function title(string $page, string $locale): string
    {
        return $this->line("public.{$page}.title", $locale)
            ?? (string) config('seo.organization.name', config('app.name', 'Workumi'));
    }

    /**
     * The meta description, falling back through the default locale to the
     * home page's description.
     */
    protected function description(string $page, string $locale): string
    {
        return $this->line("public.{$page}.description", $locale)
            ?? $this->line('public.home.description', $locale)
            ?? '';
    }

    /**
     * A translation line, or null when it is missing or blank.
     *
     * A blank value is treated as missing rather than honoured: an empty
     * <title> is worse than the wrong language, and a half-finished
     * translation file should not be able to strip a page's metadata.
     */
    protected function line(string $key, string $locale): ?string
    {
        foreach (array_unique([$locale, $this->urls->defaultLocale()]) as $candidate) {
            $value = trans($key, [], $candidate);

            if (is_string($value) && $value !== $key && trim($value) !== '') {
                return trim($value);
            }
        }

        return null;
    }
}

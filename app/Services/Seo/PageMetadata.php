<?php

namespace App\Services\Seo;

/**
 * The resolved SEO metadata for one public page in one locale.
 *
 * Everything the layout's <head> needs, already absolute and already fallen
 * back, so the Blade template makes no decisions of its own.
 */
class PageMetadata
{
    /**
     * @param  array<string, string>  $alternates  locale => absolute URL
     */
    public function __construct(
        public readonly string $page,
        public readonly string $locale,
        public readonly string $defaultLocale,
        public readonly string $title,
        public readonly string $description,
        public readonly string $canonical,
        public readonly array $alternates,
        public readonly string $image,
        public readonly string $siteName,
    ) {}

    /**
     * The Open Graph locale for this page, e.g. `de_DE`.
     */
    public function ogLocale(): string
    {
        return $this->ogLocaleFor($this->locale);
    }

    /**
     * The Open Graph locales of the other translations.
     *
     * @return array<int, string>
     */
    public function ogAlternateLocales(): array
    {
        return array_values(array_map(
            fn (string $locale): string => $this->ogLocaleFor($locale),
            array_diff(array_keys($this->alternates), [$this->locale])
        ));
    }

    /**
     * The URL search engines should treat as the language-neutral default.
     */
    public function xDefault(): string
    {
        return $this->alternates[$this->defaultLocale] ?? $this->canonical;
    }

    /**
     * Map an app locale onto an Open Graph `language_TERRITORY` value.
     *
     * The doubling rule (`de` => `de_DE`) holds for every locale the site
     * serves except English, which has no `en_EN`.
     */
    protected function ogLocaleFor(string $locale): string
    {
        return match ($locale) {
            'en' => 'en_US',
            default => $locale.'_'.strtoupper($locale),
        };
    }
}

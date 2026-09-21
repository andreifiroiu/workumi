<?php

namespace App\Services\Seo;

/**
 * Builds the JSON-LD `@graph` for a public page.
 *
 * One graph per page, with nodes cross-referenced by `@id` so that crawlers
 * read a single organisation and a single website rather than a fresh copy of
 * each on every URL.
 *
 * JSON-LD is built here and never in Blade: `@context` is a Blade directive,
 * so a literal graph in a template compiles to PHP and ships as broken markup.
 * `tests/Unit/BladeMarkupTest.php` enforces that.
 */
class StructuredData
{
    public function __construct(private readonly PublicUrls $urls) {}

    /**
     * The full graph for a page, ready for json_encode().
     *
     * @return array<string, mixed>
     */
    public function forPage(PageMetadata $meta): array
    {
        $graph = [$this->organization(), $this->webPage($meta)];

        if ($meta->page === 'home') {
            $graph[] = $this->website();
            $graph[] = $this->softwareApplication();
        } else {
            $graph[] = $this->breadcrumbs($meta);
        }

        return [
            '@context' => 'https://schema.org',
            '@graph' => $graph,
        ];
    }

    /**
     * The page's graph as an HTML-safe JSON string.
     *
     * Slashes and unicode are left unescaped for legibility; `JSON_HEX_TAG`
     * keeps a `</script>` inside any translated string from closing the block
     * it is embedded in.
     *
     * `JSON_THROW_ON_ERROR` matters more than it looks: without it, malformed
     * UTF-8 in a single translation file makes json_encode return false, which
     * casts to '' — and the layout, guarding on truthiness, would then drop the
     * whole graph for that locale while the page still rendered perfectly.
     *
     * @throws \JsonException
     */
    public function jsonFor(PageMetadata $meta): string
    {
        return json_encode(
            $this->forPage($meta),
            JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP | JSON_THROW_ON_ERROR
        );
    }

    /**
     * @return array<string, mixed>
     */
    protected function organization(): array
    {
        $base = $this->urls->baseUrl();

        $node = [
            '@type' => 'Organization',
            '@id' => $base.'/#organization',
            'name' => (string) config('seo.organization.name'),
            'url' => $base.'/',
            'logo' => [
                '@type' => 'ImageObject',
                '@id' => $base.'/#logo',
                'url' => $this->urls->asset((string) config('seo.organization.logo')),
            ],
        ];

        /** @var array<int, string> $sameAs */
        $sameAs = config('seo.organization.same_as', []);

        if ($sameAs !== []) {
            $node['sameAs'] = array_values($sameAs);
        }

        return $node;
    }

    /**
     * @return array<string, mixed>
     */
    protected function website(): array
    {
        $base = $this->urls->baseUrl();

        return [
            '@type' => 'WebSite',
            '@id' => $base.'/#website',
            'url' => $base.'/',
            'name' => (string) config('seo.organization.name'),
            'publisher' => ['@id' => $base.'/#organization'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    protected function softwareApplication(): array
    {
        $base = $this->urls->baseUrl();

        return [
            '@type' => 'SoftwareApplication',
            '@id' => $base.'/#software',
            'name' => (string) config('seo.organization.name'),
            'url' => $base.'/',
            'applicationCategory' => (string) config('seo.application.category'),
            'operatingSystem' => (string) config('seo.application.operating_system'),
            'publisher' => ['@id' => $base.'/#organization'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    protected function webPage(PageMetadata $meta): array
    {
        $base = $this->urls->baseUrl();

        return [
            '@type' => 'WebPage',
            '@id' => $meta->canonical.'#webpage',
            'url' => $meta->canonical,
            'name' => $meta->title,
            'description' => $meta->description,
            'inLanguage' => $meta->locale,
            'isPartOf' => ['@id' => $base.'/#website'],
            'primaryImageOfPage' => ['@type' => 'ImageObject', 'url' => $meta->image],
        ];
    }

    /**
     * Home > this page. There is no use-cases index to sit between them, so
     * inventing a third crumb would advertise a URL that 404s.
     *
     * @return array<string, mixed>
     */
    protected function breadcrumbs(PageMetadata $meta): array
    {
        return [
            '@type' => 'BreadcrumbList',
            '@id' => $meta->canonical.'#breadcrumb',
            'itemListElement' => [
                [
                    '@type' => 'ListItem',
                    'position' => 1,
                    'name' => (string) config('seo.organization.name'),
                    'item' => $this->urls->url('home', $meta->locale),
                ],
                [
                    '@type' => 'ListItem',
                    'position' => 2,
                    'name' => $meta->title,
                    'item' => $meta->canonical,
                ],
            ],
        ];
    }
}

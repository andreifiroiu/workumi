<?php

namespace App\Services\Seo;

use Illuminate\Support\Facades\Cache;
use RuntimeException;
use XMLWriter;

/**
 * Generates sitemap.xml for the public marketing pages.
 *
 * Every locale of a page is listed as its own <url>, each carrying the full
 * set of `xhtml:link` alternates. That reciprocity is what Google requires:
 * a page that names an alternate which does not name it back is ignored.
 *
 * No <lastmod>, <changefreq> or <priority>. Google ignores the latter two
 * outright and distrusts a <lastmod> it can show to be wrong, and these pages
 * have no edit timestamp to report honestly.
 */
class SitemapService
{
    public function __construct(private readonly PublicUrls $urls) {}

    /**
     * The sitemap XML, from cache when it is warm.
     */
    public function cached(): string
    {
        return Cache::remember(
            $this->cacheKey(),
            (int) config('seo.sitemap.cache_ttl', 3600),
            fn (): string => $this->generate()
        );
    }

    /**
     * The cache key, fingerprinted with everything the sitemap is built from.
     *
     * Without the fingerprint, a sitemap generated under a wrong APP_URL — or
     * one generated before a page was added to seo.pages — would be served for
     * the rest of the TTL after the mistake was corrected. Keying on the inputs
     * means fixing the input is the invalidation.
     */
    public function cacheKey(): string
    {
        $fingerprint = sha1(json_encode([
            $this->urls->baseUrl(),
            $this->urls->pages(),
            $this->urls->locales(),
        ]) ?: '');

        return (string) config('seo.sitemap.cache_key', 'seo.sitemap').'.'.$fingerprint;
    }

    /**
     * Build the sitemap XML.
     *
     * @throws RuntimeException when there is nothing to advertise. An empty
     *                          <urlset> is not a neutral answer: it tells a
     *                          crawler the site has no pages at all, so a
     *                          stale config cache must fail loudly instead.
     */
    public function generate(): string
    {
        if ($this->urls->pages() === []) {
            throw new RuntimeException(
                'seo.pages is empty, so the sitemap would advertise no URLs at all.'
            );
        }

        $writer = new XMLWriter;
        $writer->openMemory();
        $writer->startDocument('1.0', 'UTF-8');
        $writer->setIndent(true);

        $writer->startElement('urlset');
        $writer->writeAttribute('xmlns', 'http://www.sitemaps.org/schemas/sitemap/0.9');
        $writer->writeAttribute('xmlns:xhtml', 'http://www.w3.org/1999/xhtml');

        foreach (array_keys($this->urls->pages()) as $page) {
            $alternates = $this->urls->alternates($page);

            foreach ($alternates as $url) {
                $this->writeUrl($writer, $url, $alternates);
            }
        }

        $writer->endElement();
        $writer->endDocument();

        return $writer->outputMemory();
    }

    /**
     * The URLs the sitemap advertises, in document order.
     *
     * @return array<int, string>
     */
    public function urls(): array
    {
        $urls = [];

        foreach (array_keys($this->urls->pages()) as $page) {
            foreach ($this->urls->alternates($page) as $url) {
                $urls[] = $url;
            }
        }

        return $urls;
    }

    /**
     * @param  array<string, string>  $alternates
     */
    protected function writeUrl(XMLWriter $writer, string $url, array $alternates): void
    {
        $writer->startElement('url');
        $writer->writeElement('loc', $url);

        foreach ($alternates as $locale => $alternateUrl) {
            $this->writeAlternate($writer, $locale, $alternateUrl);
        }

        $this->writeAlternate(
            $writer,
            'x-default',
            $alternates[$this->urls->defaultLocale()] ?? $url
        );

        $writer->endElement();
    }

    protected function writeAlternate(XMLWriter $writer, string $hreflang, string $href): void
    {
        $writer->startElement('xhtml:link');
        $writer->writeAttribute('rel', 'alternate');
        $writer->writeAttribute('hreflang', $hreflang);
        $writer->writeAttribute('href', $href);
        $writer->endElement();
    }
}

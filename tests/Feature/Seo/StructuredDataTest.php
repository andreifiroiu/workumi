<?php

use App\Services\Seo\PageSeo;
use App\Services\Seo\PublicUrls;
use App\Services\Seo\StructuredData;

beforeEach(function () {
    $this->withoutVite();
    config(['app.url' => 'https://workumi.com']);
});

/**
 * Pull the JSON-LD graph out of a rendered page.
 *
 * @return array<int, array<string, mixed>>
 */
function graphFor(string $html): array
{
    expect(preg_match('#<script type="application/ld\+json">(.*?)</script>#s', $html, $matches))
        ->toBe(1, 'the page carries exactly one JSON-LD block');

    $decoded = json_decode($matches[1], true);

    expect(json_last_error())->toBe(JSON_ERROR_NONE, 'the JSON-LD block is valid JSON');

    return $decoded['@graph'];
}

/**
 * @param  array<int, array<string, mixed>>  $graph
 */
function nodeOfType(array $graph, string $type): ?array
{
    foreach ($graph as $node) {
        if (($node['@type'] ?? null) === $type) {
            return $node;
        }
    }

    return null;
}

it('emits valid JSON-LD on every public page', function (string $path) {
    $graph = graphFor($this->get($path)->getContent());

    expect($graph)->not->toBeEmpty();
})->with(['/', '/es', '/use-cases/agencies', '/de/use-cases/operations']);

it('describes the organisation on every page', function (string $path) {
    $organization = nodeOfType(graphFor($this->get($path)->getContent()), 'Organization');

    expect($organization)->not->toBeNull()
        ->and($organization['@id'])->toBe('https://workumi.com/#organization')
        ->and($organization['name'])->toBe('Workumi')
        ->and($organization['logo']['url'])->toBe('https://workumi.com/logo.svg');
})->with(['/', '/fr', '/use-cases/consultancies']);

it('describes the website and the product on the home page only', function () {
    $home = graphFor($this->get('/')->getContent());
    $inner = graphFor($this->get('/use-cases/agencies')->getContent());

    expect(nodeOfType($home, 'WebSite'))->not->toBeNull()
        ->and(nodeOfType($home, 'SoftwareApplication'))->not->toBeNull()
        ->and(nodeOfType($inner, 'WebSite'))->toBeNull()
        ->and(nodeOfType($inner, 'SoftwareApplication'))->toBeNull();
});

it('gives the use-case pages a two-step breadcrumb', function () {
    $breadcrumb = nodeOfType(graphFor($this->get('/es/use-cases/agencies')->getContent()), 'BreadcrumbList');

    expect($breadcrumb)->not->toBeNull()
        ->and($breadcrumb['itemListElement'])->toHaveCount(2)
        ->and($breadcrumb['itemListElement'][0]['item'])->toBe('https://workumi.com/es')
        ->and($breadcrumb['itemListElement'][1]['item'])->toBe('https://workumi.com/es/use-cases/agencies');
});

it('keeps breadcrumbs off the home page, where they would only point at itself', function () {
    expect(nodeOfType(graphFor($this->get('/')->getContent()), 'BreadcrumbList'))->toBeNull();
});

it('points the page node at the canonical URL and declares its language', function () {
    $webPage = nodeOfType(graphFor($this->get('/ro/use-cases/operations')->getContent()), 'WebPage');

    expect($webPage['url'])->toBe('https://workumi.com/ro/use-cases/operations')
        ->and($webPage['inLanguage'])->toBe('ro')
        ->and($webPage['isPartOf']['@id'])->toBe('https://workumi.com/#website');
});

it('cross-references nodes by ids that exist in the graph', function () {
    $graph = graphFor($this->get('/')->getContent());

    $ids = array_filter(array_column($graph, '@id'));

    foreach ($graph as $node) {
        foreach (['publisher', 'isPartOf'] as $property) {
            if (isset($node[$property]['@id'])) {
                expect(in_array($node[$property]['@id'], $ids, true))->toBeTrue(
                    "{$node['@type']}.{$property} references an @id that is not in the graph"
                );
            }
        }
    }
});

it('cannot have a translated string break out of the script block', function () {
    app('translator')->addLines(
        ['public.home.title' => 'Workumi </script><script>alert(1)</script>'],
        'en'
    );

    $html = $this->get('/')->getContent();

    expect($html)->not->toContain('</script><script>alert(1)');

    graphFor($html);
});

it('builds a graph for every page in every locale', function () {
    $urls = app(PublicUrls::class);
    $structuredData = app(StructuredData::class);
    $seo = app(PageSeo::class);

    foreach (array_keys($urls->pages()) as $page) {
        foreach ($urls->locales() as $locale) {
            $meta = $seo->forPath(trim($urls->path($page, $locale), '/'));

            $json = $structuredData->jsonFor($meta);

            expect(json_decode($json, true))->toBeArray()
                ->and(json_last_error())->toBe(JSON_ERROR_NONE);
        }
    }
});

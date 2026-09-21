<?php

use App\Services\Seo\RobotsTxt;

beforeEach(function () {
    config([
        'app.url' => 'https://workumi.com',
        'seo.robots.public_hosts' => ['workumi.com', 'www.workumi.com'],
    ]);
});

it('serves robots.txt as plain text', function () {
    $this->get('/robots.txt')
        ->assertOk()
        ->assertHeader('Content-Type', 'text/plain; charset=UTF-8');
});

it('never answers 404, which a crawler reads as no rules at all', function () {
    $this->get('/robots.txt')->assertOk();
});

it('allows the public pages on an allow-listed host', function () {
    $body = app(RobotsTxt::class)->body();

    expect($body)
        ->toContain('User-agent: *')
        // The wildcard group must not be a blanket disallow. (A per-agent
        // "Disallow: /" is expected further down, for the training crawlers.)
        ->not->toContain('User-agent: *'.PHP_EOL.'Disallow: /'.PHP_EOL);
});

it('disallows the authenticated app', function (string $path) {
    expect(app(RobotsTxt::class)->body())->toContain('Disallow: '.$path);
})->with(['/today', '/work', '/settings', '/login', '/register', '/api/', '/mcp', '/log-viewer']);

it('disallows training-corpus crawlers outright', function (string $agent) {
    $body = app(RobotsTxt::class)->body();

    expect($body)->toMatch('/User-agent: '.preg_quote($agent, '/').'\R'.'Disallow: \/\R/');
})->with(['GPTBot', 'ClaudeBot', 'CCBot', 'Google-Extended', 'Bytespider', 'meta-externalagent']);

it('gives answer and search crawlers the same rules as everyone else', function (string $agent) {
    $body = app(RobotsTxt::class)->body();

    expect($body)->toContain('User-agent: '.$agent);

    // They appear in the shared group, not in a per-agent "Disallow: /" block.
    expect($body)->not->toMatch('/User-agent: '.preg_quote($agent, '/').'\R'.'Disallow: \/\R/');
})->with(['OAI-SearchBot', 'ChatGPT-User', 'Claude-User', 'Claude-SearchBot', 'PerplexityBot']);

it('names the sitemap', function () {
    expect(app(RobotsTxt::class)->body())->toContain('Sitemap: https://workumi.com/sitemap.xml');
});

it('closes any host that is not on the allow-list', function (string $url) {
    config(['app.url' => $url]);

    $robots = app(RobotsTxt::class);

    expect($robots->policy())->toBe(RobotsTxt::POLICY_CLOSED)
        ->and($robots->body())->toContain('User-agent: *'.PHP_EOL.'Disallow: /')
        ->and($robots->body())->not->toContain('Sitemap:');
})->with([
    'staging' => ['https://staging.workumi.com'],
    'a typo in the production host' => ['https://wokrumi.com'],
    'a developer machine' => ['http://workumi.test'],
    'no host at all' => [''],
]);

it('matches the host case-insensitively', function () {
    config(['app.url' => 'https://WORKUMI.com']);

    expect(app(RobotsTxt::class)->policy())->toBe(RobotsTxt::POLICY_OPEN);
});

it('serves exactly what the published file would contain', function () {
    $route = $this->get('/robots.txt')->getContent();

    expect($route)->toBe(app(RobotsTxt::class)->body());
});

it('is not itself marked noindex', function () {
    $this->get('/robots.txt')->assertHeaderMissing('X-Robots-Tag');
    $this->get('/sitemap.xml')->assertHeaderMissing('X-Robots-Tag');
});

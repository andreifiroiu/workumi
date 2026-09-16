<?php

use App\Models\User;

beforeEach(function () {
    $this->withoutVite();
    config(['app.url' => 'https://workumi.com']);
});

it('serves every public page in every locale', function (string $path, string $locale) {
    $response = $this->get($path);

    $response->assertOk();
    $response->assertSee('lang="'.$locale.'"', escape: false);
})->with([
    ['/', 'en'],
    ['/es', 'es'],
    ['/fr', 'fr'],
    ['/de', 'de'],
    ['/ro', 'ro'],
    ['/use-cases/agencies', 'en'],
    ['/es/use-cases/agencies', 'es'],
    ['/fr/use-cases/consultancies', 'fr'],
    ['/de/use-cases/operations', 'de'],
    ['/ro/use-cases/agencies', 'ro'],
]);

it('renders each locale in its own language', function () {
    $this->get('/de/use-cases/agencies')
        ->assertSee(trans('public.agencies.headline', [], 'de'), escape: false)
        ->assertDontSee(trans('public.agencies.headline', [], 'en'), escape: false);
});

it('ignores the language cookie on public pages so one URL serves one language', function () {
    $this->withCookie('language', 'fr')
        ->get('/')
        ->assertSee(trans('public.home.headline', [], 'en'), escape: false)
        ->assertDontSee(trans('public.home.headline', [], 'fr'), escape: false);
});

it("ignores a signed-in user's language preference on public pages", function () {
    $user = User::factory()->create(['language' => 'ro']);

    $this->actingAs($user)
        ->get('/es')
        ->assertSee(trans('public.home.headline', [], 'es'), escape: false)
        ->assertDontSee(trans('public.home.headline', [], 'ro'), escape: false);
});

it('permanently redirects the /en alias to the unprefixed URL', function (string $from, string $to) {
    $this->get($from)->assertRedirect($to)->assertStatus(301);
})->with([
    ['/en', '/'],
    ['/en/use-cases/agencies', '/use-cases/agencies'],
]);

it('404s an unknown page under a locale prefix', function () {
    $this->get('/es/use-cases/nope')->assertNotFound();
});

it('sends the language switcher to the same page in the new language', function () {
    $this->from('/use-cases/consultancies')
        ->get('/language/ro')
        ->assertRedirect('/ro/use-cases/consultancies')
        ->assertPlainCookie('language', 'ro');
});

it('switches language from an already-localized page without stacking prefixes', function () {
    $this->from('/es/use-cases/agencies')
        ->get('/language/fr')
        ->assertRedirect('/fr/use-cases/agencies');
});

it('leaves a non-public page where it was when the language changes', function () {
    $this->from('/some/unknown/page')
        ->get('/language/de')
        ->assertRedirect('/some/unknown/page')
        ->assertPlainCookie('language', 'de');
});

it('keeps an app visitor where they were when they switch language', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->from('/today')
        ->get('/language/de')
        ->assertRedirect('/today');

    expect($user->refresh()->language)->toBe('de');
});

it('falls back to the default locale for an unsupported language code', function () {
    $this->from('/es')
        ->get('/language/zz')
        ->assertPlainCookie('language', 'en');
});

it('redirects Folio\'s case-insensitive aliases onto the canonical URL', function (string $from, string $to) {
    // Folio matches its mounts with a lowercased path, so /ES renders the /es
    // mount — but resolves to no page here, giving an indexable duplicate with
    // no canonical, no hreflang and the wrong language.
    $this->get($from)->assertRedirect($to)->assertStatus(301);
})->with([
    ['/ES', '/es'],
    ['/De/use-cases/agencies', '/de/use-cases/agencies'],
    ['/use-cases/Agencies', '/use-cases/agencies'],
]);

it('redirects Folio\'s /index alias onto the home page', function (string $from, string $to) {
    $this->get($from)->assertRedirect($to)->assertStatus(301);
})->with([
    ['/index', '/'],
    ['/es/index', '/es'],
]);

it('keeps the query string across every canonicalising redirect', function (string $from, string $to) {
    // Campaign links built against an alias must not lose their attribution.
    $this->get($from.'?utm_source=newsletter&gclid=abc')
        ->assertRedirect($to.'?utm_source=newsletter&gclid=abc');
})->with([
    ['/en/use-cases/agencies', '/use-cases/agencies'],
    ['/index', '/'],
    ['/ES', '/es'],
]);

it('does not redirect a URL that is already canonical', function (string $path) {
    $this->get($path)->assertOk();
})->with(['/', '/es', '/use-cases/agencies', '/ro/use-cases/operations']);

it('refuses to send the language switcher to another host', function () {
    $this->get('/language/fr', ['referer' => 'https://evil.example.com/phish'])
        ->assertRedirect('/');
});

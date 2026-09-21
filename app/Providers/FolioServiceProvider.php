<?php

namespace App\Providers;

use App\Http\Middleware\SetPublicLocale;
use App\Services\Seo\PublicUrls;
use Illuminate\Support\ServiceProvider;
use Laravel\Folio\Folio;

class FolioServiceProvider extends ServiceProvider
{
    /**
     * Register services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap services.
     *
     * The same page directory is mounted once per locale. Four Blade files
     * therefore serve twenty URLs, and a change to a page reaches every
     * language at once.
     */
    public function boot(): void
    {
        $path = resource_path('views/pages');
        $middleware = ['*' => [SetPublicLocale::class]];
        $urls = new PublicUrls;

        /*
         * Registration order is load-bearing. FolioManager keeps mount paths in
         * the order they are registered and RequestHandler returns the first
         * one that matches a view, while the root mount's base URI ("/")
         * prefix-matches every request. Registered the other way round, "/es"
         * would be looked up as a page named "es" under the root mount.
         */
        foreach ($urls->prefixedLocales() as $locale) {
            Folio::path($path)->uri('/'.$locale)->middleware($middleware);
        }

        Folio::path($path)->uri('/')->middleware($middleware);
    }
}

<?php

namespace App\Providers;

use App\Services\Seo\PageSeo;
use App\Services\Seo\PublicUrls;
use App\Services\Seo\StructuredData;
use Illuminate\Support\Facades\View;
use Illuminate\Support\ServiceProvider;

class SeoServiceProvider extends ServiceProvider
{
    /**
     * Bootstrap any application services.
     *
     * Binds the resolved metadata onto the public layout, so the four page
     * templates stay free of SEO wiring: adding a page means adding it to
     * config/seo.php and dropping a Blade file in resources/views/pages.
     *
     * `$seo` is null for a page that exists on disk but not in `seo.pages`.
     * The layout then omits the canonical, the alternates and the JSON-LD
     * rather than advertising a URL this class cannot vouch for.
     */
    public function boot(): void
    {
        View::composer('components.layouts.public', function ($view): void {
            $urls = app(PublicUrls::class);
            $locale = app()->getLocale();
            $meta = app(PageSeo::class)->forPath(request()->path());

            /*
             * The header and footer links are built for the locale being
             * served, so a visitor reading /es does not fall back to English
             * by following the navigation.
             */
            $navLinks = [];

            foreach (array_keys($urls->pages()) as $page) {
                if ($page !== 'home') {
                    $navLinks[$page] = $urls->path($page, $locale);
                }
            }

            $view->with([
                'seo' => $meta,
                'structuredData' => $meta ? app(StructuredData::class)->jsonFor($meta) : null,
                'homeUrl' => $urls->path('home', $locale),
                'navLinks' => $navLinks,
            ]);
        });
    }
}

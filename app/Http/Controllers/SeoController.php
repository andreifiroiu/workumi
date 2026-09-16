<?php

namespace App\Http\Controllers;

use App\Services\Seo\RobotsTxt;
use App\Services\Seo\SitemapService;
use Illuminate\Http\Response;

class SeoController extends Controller
{
    /**
     * Serve robots.txt.
     *
     * Normally the web server answers this from public/robots.txt, written at
     * deploy time by `seo:publish-robots`. This route is the safety net for a
     * host where that step was forgotten: without it the request 404s, and a
     * 404 on robots.txt reads to a crawler as "no rules at all".
     */
    public function robots(RobotsTxt $robots): Response
    {
        return response($robots->body(), 200, [
            'Content-Type' => 'text/plain; charset=UTF-8',
        ]);
    }

    public function sitemap(SitemapService $sitemap): Response
    {
        return response($sitemap->cached(), 200, [
            'Content-Type' => 'application/xml; charset=UTF-8',
        ]);
    }
}

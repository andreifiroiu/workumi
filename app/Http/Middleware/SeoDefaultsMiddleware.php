<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Marks the authenticated app and the auth endpoints as noindex.
 *
 * robots.txt asks crawlers not to fetch these paths. This header tells a
 * crawler that fetched one anyway — following an inbound link, or working from
 * a cached robots file — not to index it. The app is Inertia-rendered, so a
 * meta tag in the HTML would arrive too late to be reliable; the header is
 * read whatever the body turns out to be.
 */
class SeoDefaultsMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        /** @var array<int, string> $patterns */
        $patterns = config('seo.noindex_paths', []);

        if ($patterns !== [] && $request->is(...$patterns)) {
            $response->headers->set('X-Robots-Tag', 'noindex, nofollow');
        }

        return $response;
    }
}

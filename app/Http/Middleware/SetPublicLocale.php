<?php

namespace App\Http\Middleware;

use App\Services\Seo\PublicUrls;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Symfony\Component\HttpFoundation\Response;

/**
 * Sets the locale of a public marketing page from its URL, and only from its URL.
 *
 * This runs after SetLocale (which is on the `web` group) and deliberately
 * overrides it: on a public page the URL is the contract. If a cookie could
 * change what `/` returns, one URL would serve five languages, which is both a
 * duplicate-content problem and a cache-poisoning one.
 *
 * The authenticated app keeps SetLocale's cookie and user-preference
 * behaviour; only the Folio mounts carry this middleware.
 */
class SetPublicLocale
{
    public function __construct(private readonly PublicUrls $urls) {}

    public function handle(Request $request, Closure $next): Response
    {
        $path = $request->path();

        /*
         * Folio serves more URLs than the URL map advertises: its mounts match
         * case-insensitively (so /ES renders) and index.blade.php answers at
         * /index as well as /. Those are crawlable duplicates with no canonical
         * of their own, so they are redirected onto the one real URL rather
         * than rendered.
         */
        $canonical = $this->urls->canonicalPathFor($path);

        if ($canonical !== null && $canonical !== '/'.ltrim($path, '/')) {
            // Raw QUERY_STRING rather than getQueryString(), which sorts the
            // parameters; a redirect should hand back what it was given.
            $query = (string) $request->server->get('QUERY_STRING', '');

            return redirect($canonical.($query !== '' ? '?'.$query : ''), 301);
        }

        App::setLocale($this->urls->localeForPath($path));

        return $next($request);
    }
}

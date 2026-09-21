<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Default Locale
    |--------------------------------------------------------------------------
    |
    | The locale served without a URL prefix. Read from the environment rather
    | than from `app.locale`, because Application::setLocale() rewrites that
    | key on every request: mid-request, `app.locale` says which language is
    | being rendered, not which language owns the unprefixed URLs.
    |
    */

    'default_locale' => env('APP_LOCALE', 'en'),

    /*
    |--------------------------------------------------------------------------
    | Public Pages
    |--------------------------------------------------------------------------
    |
    | The marketing pages served by Folio from resources/views/pages. The key
    | is used to look up copy in lang/{locale}/public.php and to name the
    | structured data; the value is the path below the locale prefix.
    |
    | This list is the single source of truth for the sitemap, the hreflang
    | alternates and the language switcher, so a page added here appears in
    | all three at once.
    |
    */

    'pages' => [
        'home' => '',
        'agencies' => 'use-cases/agencies',
        'consultancies' => 'use-cases/consultancies',
        'operations' => 'use-cases/operations',
    ],

    /*
    |--------------------------------------------------------------------------
    | Meta Defaults
    |--------------------------------------------------------------------------
    |
    | Used when a page supplies no value of its own. The image is resolved
    | against APP_URL, because Open Graph consumers reject relative URLs.
    |
    */

    'meta' => [
        'image' => '/images/og-default.png',
        'twitter_card' => 'summary_large_image',
        'twitter_site' => env('SEO_TWITTER_SITE'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Organization
    |--------------------------------------------------------------------------
    |
    | Facts behind the sitewide Organization and SoftwareApplication nodes.
    | `same_as` should list profiles the organisation controls; an empty list
    | is emitted as no property rather than an empty array.
    |
    */

    'organization' => [
        'name' => 'Workumi',
        'logo' => '/logo.svg',
        'same_as' => array_values(array_filter(
            explode(',', (string) env('SEO_SAME_AS', ''))
        )),
    ],

    'application' => [
        'category' => 'BusinessApplication',
        'operating_system' => 'Web',
    ],

    /*
    |--------------------------------------------------------------------------
    | Robots
    |--------------------------------------------------------------------------
    |
    | `public_hosts` is an allow-list, not a prefix match: a host that is not
    | named here is served `Disallow: /`. Staging and preview environments are
    | therefore closed by default, and a typo in APP_URL closes production
    | rather than silently opening a staging box.
    |
    */

    'robots' => [

        /*
         * Where `seo:publish-robots` writes. Overridable so tests do not have
         * to mutate the real (gitignored) file, where an aborted run would
         * leave a stale artifact that `git status` never shows.
         */
        'path' => public_path('robots.txt'),

        'public_hosts' => array_values(array_filter(array_map(
            'trim',
            explode(',', (string) env('SEO_PUBLIC_HOSTS', 'workumi.com,www.workumi.com'))
        ))),

        /*
         * Paths no crawler should fetch.
         *
         * Most are the authenticated app and the auth endpoints, which redirect
         * to /login for a crawler: wasted crawl budget and a login page in the
         * index. Two are not auth-gated at all and matter more — /shared/ serves
         * documents behind a share token and /storage/ serves uploads, and a
         * share link pasted anywhere that leaks a referer or renders a preview
         * is how those reach a crawler.
         *
         * Kept in step with the route table by SeoDefaultsMiddlewareTest, which
         * walks every registered GET route rather than a hand-copied list.
         */
        'disallow' => [
            '/.well-known/',
            '/_legacy/',
            '/account',
            '/api/',
            '/capture',
            '/client-communications',
            '/communications',
            '/dashboard',
            '/directory',
            '/documents',
            '/email/verify',
            '/folders',
            '/forgot-password',
            '/inbox',
            '/invitation/',
            '/language/',
            '/log-viewer',
            '/login',
            '/logout',
            '/mcp',
            '/oauth/',
            '/playbooks',
            '/register',
            '/reports',
            '/reset-password',
            '/review',
            '/sanctum/',
            '/settings',
            '/shared/',
            '/storage/',
            '/today',
            '/two-factor-challenge',
            '/up',
            '/user/',
            '/work',
        ],

        /*
         * AI crawlers, split by what they do with the page.
         *
         * `answer` bots fetch a page to cite it in an answer or to back a
         * search result, so they get the same rules as any other crawler.
         * `training` bots collect corpora and are disallowed outright.
         */
        'ai_crawlers' => [

            'answer' => [
                'ChatGPT-User',
                'Claude-SearchBot',
                'Claude-User',
                'OAI-SearchBot',
                'PerplexityBot',
            ],

            'training' => [
                'AI2Bot',
                'Applebot-Extended',
                'Bytespider',
                'CCBot',
                'ClaudeBot',
                'Diffbot',
                'FacebookBot',
                'GPTBot',
                'Google-Extended',
                'ImagesiftBot',
                'Omgilibot',
                'PanguBot',
                'Timpibot',
                'meta-externalagent',
            ],
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Noindex Paths
    |--------------------------------------------------------------------------
    |
    | Request paths that receive `X-Robots-Tag: noindex, nofollow`. robots.txt
    | asks a crawler not to fetch these; the header tells one that fetched them
    | anyway (from a link, or with a cached robots file) not to index them.
    |
    | Patterns use Request::is() syntax.
    |
    */

    'noindex_paths' => [
        '.well-known/*',
        '_legacy/*',
        'account*',
        'api/*',
        'capture*',
        'client-communications*',
        'communications*',
        'dashboard*',
        'directory*',
        'documents*',
        'email/verify*',
        'folders*',
        'forgot-password*',
        'inbox*',
        'invitation/*',
        'language/*',
        'log-viewer*',
        'login',
        'logout',
        'mcp*',
        'oauth/*',
        'playbooks*',
        'register',
        'reports*',
        'reset-password*',
        'review*',
        'sanctum/*',
        'settings*',
        'shared/*',
        'storage/*',
        'today*',
        'two-factor-challenge',
        'up',
        'user/*',
        'work*',
    ],

    /*
    |--------------------------------------------------------------------------
    | Sitemap
    |--------------------------------------------------------------------------
    */

    'sitemap' => [
        'cache_ttl' => 3600,
        'cache_key' => 'seo.sitemap',
    ],

];

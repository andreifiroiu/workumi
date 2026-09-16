<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">

    {{-- $seo is bound by SeoServiceProvider; it is null for a page not listed in config/seo.php. --}}
    @php
        $metaDescription = trim($description ?? $seo?->description ?? __('public.home.description'));
    @endphp
    <title>{{ $title ?? $seo?->title ?? config('app.name', 'Workumi') }}</title>
    {{-- Omitted rather than emitted empty: a blank description tag is worse than none. --}}
    @if ($metaDescription !== '')
        <meta name="description" content="{{ $metaDescription }}">
    @endif

    @if ($seo)
        <link rel="canonical" href="{{ $seo->canonical }}">

        @foreach ($seo->alternates as $alternateLocale => $alternateUrl)
            <link rel="alternate" hreflang="{{ $alternateLocale }}" href="{{ $alternateUrl }}">
        @endforeach
        <link rel="alternate" hreflang="x-default" href="{{ $seo->xDefault() }}">

        <meta property="og:type" content="website">
        <meta property="og:site_name" content="{{ $seo->siteName }}">
        <meta property="og:title" content="{{ $seo->title }}">
        <meta property="og:description" content="{{ $seo->description }}">
        <meta property="og:url" content="{{ $seo->canonical }}">
        <meta property="og:image" content="{{ $seo->image }}">
        <meta property="og:locale" content="{{ $seo->ogLocale() }}">
        @foreach ($seo->ogAlternateLocales() as $ogAlternateLocale)
            <meta property="og:locale:alternate" content="{{ $ogAlternateLocale }}">
        @endforeach

        <meta name="twitter:card" content="{{ config('seo.meta.twitter_card') }}">
        @if (config('seo.meta.twitter_site'))
            <meta name="twitter:site" content="{{ config('seo.meta.twitter_site') }}">
        @endif
        <meta name="twitter:title" content="{{ $seo->title }}">
        <meta name="twitter:description" content="{{ $seo->description }}">
        <meta name="twitter:image" content="{{ $seo->image }}">
    @endif

    <link rel="icon" href="/favicon.ico" sizes="any">
    <link rel="icon" href="/favicon.svg" type="image/svg+xml">
    <link rel="apple-touch-icon" href="/apple-touch-icon.png">

    <link rel="preconnect" href="https://fonts.bunny.net">
    <link href="https://fonts.bunny.net/css?family=inter:400,500,600,700|ibm-plex-mono:400,500,600" rel="stylesheet" />

    @vite(['resources/css/app.css'])

    {{-- Built in App\Services\Seo\StructuredData. A JSON-LD graph written inline here would
         have its context key compiled as a Blade directive. See tests/Unit/BladeMarkupTest.php. --}}
    @if ($structuredData)
        <script type="application/ld+json">{!! $structuredData !!}</script>
    @endif
</head>
<body class="bg-background text-foreground font-sans antialiased">
    {{-- Navigation --}}
    <header class="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <nav class="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
            <a href="{{ $homeUrl }}" class="flex items-center gap-2">
                <img src="/logo.svg" alt="{{ config('app.name') }}" class="h-8 w-auto">
{{--                <span class="text-lg tracking-tight">{{ __('public.nav.tagline') }}</span>--}}
            </a>

            <div class="hidden items-center gap-8 md:flex">
                @foreach ($navLinks as $navKey => $navUrl)
                    <a href="{{ $navUrl }}" class="text-sm text-muted-foreground transition hover:text-foreground">{{ __('public.nav.'.$navKey) }}</a>
                @endforeach
            </div>

            <div class="flex items-center gap-2 sm:gap-3">
                {{-- Language Switcher --}}
                @php
                    $currentLocale = app()->getLocale();
                    $locales = [
                        'en' => ['label' => 'English',  'flag' => '🇬🇧'],
                        'es' => ['label' => 'Español',  'flag' => '🇪🇸'],
                        'fr' => ['label' => 'Français', 'flag' => '🇫🇷'],
                        'de' => ['label' => 'Deutsch',  'flag' => '🇩🇪'],
                        'ro' => ['label' => 'Română',   'flag' => '🇷🇴'],
                    ];
                    $current = $locales[$currentLocale] ?? $locales['en'];
                @endphp
                <details class="group relative" data-dropdown>
                    <summary class="flex cursor-pointer list-none items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground focus:outline-none focus:ring-1 focus:ring-ring [&::-webkit-details-marker]:hidden">
                        <span class="text-sm leading-none">{{ $current['flag'] }}</span>
                        <span class="hidden sm:inline">{{ $current['label'] }}</span>
                    </summary>
                    <div class="absolute right-0 mt-2 min-w-[10rem] overflow-hidden rounded-md border border-border bg-background py-1 shadow-md">
                        @foreach ($locales as $code => $locale)
                            {{-- nofollow: this is a redirect endpoint, not a page. Crawlers reach
                                 the other languages through the hreflang alternates instead. --}}
                            <a
                                href="/language/{{ $code }}"
                                rel="nofollow"
                                class="flex items-center gap-2 px-3 py-1.5 text-xs transition hover:bg-secondary {{ $code === $currentLocale ? 'font-semibold text-foreground' : 'text-muted-foreground' }}"
                            >
                                <span class="text-sm leading-none">{{ $locale['flag'] }}</span>
                                <span>{{ $locale['label'] }}</span>
                            </a>
                        @endforeach
                    </div>
                </details>

                @auth
                    <details class="group relative" data-dropdown>
                        <summary class="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition hover:text-foreground focus:outline-none focus:ring-1 focus:ring-ring [&::-webkit-details-marker]:hidden">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                            <span class="sr-only">{{ Auth::user()->name }}</span>
                        </summary>
                        <div class="absolute right-0 mt-2 min-w-[12rem] overflow-hidden rounded-md border border-border bg-background py-1 shadow-md">
                            <div class="border-b border-border px-3 py-2">
                                <p class="truncate text-sm font-medium text-foreground">{{ Auth::user()->name }}</p>
                                <p class="truncate text-xs text-muted-foreground">{{ Auth::user()->email }}</p>
                            </div>
                            <form method="POST" action="/logout">
                                @csrf
                                <button type="submit" class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-muted-foreground transition hover:bg-secondary hover:text-foreground">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
                                    {{ __('public.nav.logout') }}
                                </button>
                            </form>
                        </div>
                    </details>
                    <a href="/today" class="inline-flex h-9 items-center whitespace-nowrap rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 sm:px-4">
                        {{ __('public.nav.go_to_app') }}
                    </a>
                @else
                    <a href="/login" class="whitespace-nowrap text-sm font-medium text-muted-foreground transition hover:text-foreground">{{ __('public.nav.login') }}</a>
                    <a href="/register" class="inline-flex h-9 items-center whitespace-nowrap rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 sm:px-4">
                        {{ __('public.nav.get_started') }}
                    </a>
                @endauth
            </div>
        </nav>
    </header>

    {{-- Page Content --}}
    <main>
        {{ $slot }}
    </main>

    {{-- Footer --}}
    <footer class="border-t border-border bg-secondary/50">
        <div class="mx-auto max-w-6xl px-6 py-12">
            <div class="flex flex-col items-center justify-between gap-6 md:flex-row">
                <div class="flex items-center gap-2">
                    <img src="/logo.svg" alt="{{ config('app.name') }}" class="h-6 w-auto opacity-60">
                    <span class="text-sm text-muted-foreground">{{ __('public.nav.copyright', ['year' => date('Y'), 'name' => config('app.name', 'Workumi')]) }}</span>
                </div>
                <div class="flex gap-6">
                    @foreach ($navLinks as $navKey => $navUrl)
                        <a href="{{ $navUrl }}" class="text-sm text-muted-foreground transition hover:text-foreground">{{ __('public.nav.'.$navKey) }}</a>
                    @endforeach
                </div>
            </div>
        </div>
    </footer>

    <script>
        document.addEventListener('click', function (event) {
            document.querySelectorAll('details[data-dropdown][open]').forEach(function (dropdown) {
                if (!dropdown.contains(event.target)) {
                    dropdown.open = false;
                }
            });
        });
    </script>
</body>
</html>

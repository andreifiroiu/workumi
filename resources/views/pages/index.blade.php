<x-layouts.public :title="__('public.home.title')">

    {{-- Hero --}}
    <section class="relative overflow-hidden" style="background: url('/images/hero-home-bg.svg') center/cover no-repeat">
        <div class="mx-auto max-w-6xl px-6 pb-20 pt-24 text-center md:pb-28 md:pt-32">
            <div class="mb-6 inline-flex items-center rounded-full border border-border bg-secondary px-4 py-1.5 text-xs font-medium text-muted-foreground">
                {{ __('public.home.badge') }}
            </div>
            <h1 class="mx-auto max-w-4xl text-4xl font-bold tracking-tight md:text-6xl">
                {{ __('public.home.headline') }} <span class="text-lime-600">{{ __('public.home.headline_accent') }}</span>
            </h1>
            <p class="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl">
                {{ __('public.home.subheadline') }}
            </p>
            <div class="mt-10 flex items-center justify-center gap-4">
                <a href="/register" class="inline-flex h-11 items-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition hover:bg-primary/90">
                    {{ __('public.home.cta_primary') }}
                </a>
                <a href="#features" class="inline-flex h-11 items-center rounded-md border border-border bg-background px-6 text-sm font-medium transition hover:bg-secondary">
                    {{ __('public.home.cta_secondary') }}
                </a>
            </div>
        </div>
    </section>

    {{-- Problem / Solution --}}
    <section class="border-t border-border bg-secondary/30 py-20 md:py-28">
        <div class="mx-auto max-w-6xl px-6">
            <div class="mx-auto max-w-2xl text-center">
                <h2 class="text-3xl font-bold tracking-tight md:text-4xl">{{ __('public.home.problem_title') }}</h2>
                <p class="mt-4 text-muted-foreground">{{ __('public.home.problem_subtitle') }}</p>
            </div>
            <div class="mt-16 grid gap-8 md:grid-cols-2">
                <div class="rounded-lg border border-border bg-card p-6">
                    <div class="mb-3 text-sm font-semibold uppercase tracking-wider text-destructive">{{ __('public.home.problem_label') }}</div>
                    <h3 class="text-lg font-semibold">{{ __('public.home.problem_1_title') }}</h3>
                    <p class="mt-2 text-sm text-muted-foreground">{{ __('public.home.problem_1_text') }}</p>
                </div>
                <div class="rounded-lg border border-border bg-card p-6">
                    <div class="mb-3 text-sm font-semibold uppercase tracking-wider text-lime-600">{{ __('public.home.solution_label') }}</div>
                    <h3 class="text-lg font-semibold">{{ __('public.home.solution_1_title') }}</h3>
                    <p class="mt-2 text-sm text-muted-foreground">{{ __('public.home.solution_1_text') }}</p>
                </div>
                <div class="rounded-lg border border-border bg-card p-6">
                    <div class="mb-3 text-sm font-semibold uppercase tracking-wider text-destructive">{{ __('public.home.problem_label') }}</div>
                    <h3 class="text-lg font-semibold">{{ __('public.home.problem_2_title') }}</h3>
                    <p class="mt-2 text-sm text-muted-foreground">{{ __('public.home.problem_2_text') }}</p>
                </div>
                <div class="rounded-lg border border-border bg-card p-6">
                    <div class="mb-3 text-sm font-semibold uppercase tracking-wider text-lime-600">{{ __('public.home.solution_label') }}</div>
                    <h3 class="text-lg font-semibold">{{ __('public.home.solution_2_title') }}</h3>
                    <p class="mt-2 text-sm text-muted-foreground">{{ __('public.home.solution_2_text') }}</p>
                </div>
                <div class="rounded-lg border border-border bg-card p-6">
                    <div class="mb-3 text-sm font-semibold uppercase tracking-wider text-destructive">{{ __('public.home.problem_label') }}</div>
                    <h3 class="text-lg font-semibold">{{ __('public.home.problem_3_title') }}</h3>
                    <p class="mt-2 text-sm text-muted-foreground">{{ __('public.home.problem_3_text') }}</p>
                </div>
                <div class="rounded-lg border border-border bg-card p-6">
                    <div class="mb-3 text-sm font-semibold uppercase tracking-wider text-lime-600">{{ __('public.home.solution_label') }}</div>
                    <h3 class="text-lg font-semibold">{{ __('public.home.solution_3_title') }}</h3>
                    <p class="mt-2 text-sm text-muted-foreground">{{ __('public.home.solution_3_text') }}</p>
                </div>
            </div>
        </div>
    </section>

    {{-- Features --}}
    <section id="features" class="py-20 md:py-28">
        <div class="mx-auto max-w-6xl px-6">
            <div class="mx-auto max-w-2xl text-center">
                <h2 class="text-3xl font-bold tracking-tight md:text-4xl">{{ __('public.home.features_title') }}</h2>
                <p class="mt-4 text-muted-foreground">{{ __('public.home.features_subtitle') }}</p>
            </div>
            <div class="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {{-- Feature 1 --}}
                <div class="rounded-lg border border-border bg-card p-6">
                    <div class="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-lime-600/10 text-lime-600">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                    </div>
                    <h3 class="font-semibold">{{ __('public.home.feature_1_title') }}</h3>
                    <p class="mt-2 text-sm text-muted-foreground">{{ __('public.home.feature_1_text') }}</p>
                </div>
                {{-- Feature 2 --}}
                <div class="rounded-lg border border-border bg-card p-6">
                    <div class="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-lime-600/10 text-lime-600">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    </div>
                    <h3 class="font-semibold">{{ __('public.home.feature_2_title') }}</h3>
                    <p class="mt-2 text-sm text-muted-foreground">{{ __('public.home.feature_2_text') }}</p>
                </div>
                {{-- Feature 3 --}}
                <div class="rounded-lg border border-border bg-card p-6">
                    <div class="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-lime-600/10 text-lime-600">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <h3 class="font-semibold">{{ __('public.home.feature_3_title') }}</h3>
                    <p class="mt-2 text-sm text-muted-foreground">{{ __('public.home.feature_3_text') }}</p>
                </div>
                {{-- Feature 4 --}}
                <div class="rounded-lg border border-border bg-card p-6">
                    <div class="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-lime-600/10 text-lime-600">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                    </div>
                    <h3 class="font-semibold">{{ __('public.home.feature_4_title') }}</h3>
                    <p class="mt-2 text-sm text-muted-foreground">{{ __('public.home.feature_4_text') }}</p>
                </div>
                {{-- Feature 5 --}}
                <div class="rounded-lg border border-border bg-card p-6">
                    <div class="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-lime-600/10 text-lime-600">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                    </div>
                    <h3 class="font-semibold">{{ __('public.home.feature_5_title') }}</h3>
                    <p class="mt-2 text-sm text-muted-foreground">{{ __('public.home.feature_5_text') }}</p>
                </div>
                {{-- Feature 6 --}}
                <div class="rounded-lg border border-border bg-card p-6">
                    <div class="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-lime-600/10 text-lime-600">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                    </div>
                    <h3 class="font-semibold">{{ __('public.home.feature_6_title') }}</h3>
                    <p class="mt-2 text-sm text-muted-foreground">{{ __('public.home.feature_6_text') }}</p>
                </div>
            </div>
        </div>
    </section>

    {{-- Social Proof Placeholder --}}
    <section class="border-t border-border bg-secondary/30 py-20">
        <div class="mx-auto max-w-6xl px-6 text-center">
            <p class="text-sm font-medium uppercase tracking-wider text-muted-foreground">{{ __('public.home.social_proof') }}</p>
            <div class="mt-8 flex flex-wrap items-center justify-center gap-x-12 gap-y-6 opacity-40">
                <div class="h-8 w-24 rounded bg-muted-foreground/20"></div>
                <div class="h-8 w-28 rounded bg-muted-foreground/20"></div>
                <div class="h-8 w-20 rounded bg-muted-foreground/20"></div>
                <div class="h-8 w-32 rounded bg-muted-foreground/20"></div>
                <div class="h-8 w-24 rounded bg-muted-foreground/20"></div>
            </div>
        </div>
    </section>

    {{-- Pricing --}}
    <section class="py-20 md:py-28">
        <div class="mx-auto max-w-6xl px-6">
            <div class="mx-auto max-w-2xl text-center">
                <h2 class="text-3xl font-bold tracking-tight md:text-4xl">{{ __('public.home.pricing_title') }}</h2>
                <p class="mt-4 text-muted-foreground">{{ __('public.home.pricing_subtitle') }}</p>
            </div>
            <div class="mx-auto mt-12 max-w-md">
                <div class="rounded-xl border-2 border-lime-600 bg-card p-8 text-center shadow-sm">
                    <div class="inline-flex items-center rounded-full bg-lime-600/10 px-3 py-1 text-xs font-semibold text-lime-600">
                        {{ __('public.home.pricing_badge') }}
                    </div>
                    <div class="mt-6">
                        <span class="text-5xl font-bold tracking-tight">{{ __('public.home.pricing_price') }}</span>
                    </div>
                    <p class="mt-4 text-muted-foreground">{{ __('public.home.pricing_description') }}</p>
                    <ul class="mt-8 space-y-3 text-left text-sm">
                        <li class="flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 shrink-0 text-lime-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
                            {{ __('public.home.pricing_feature_1') }}
                        </li>
                        <li class="flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 shrink-0 text-lime-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
                            {{ __('public.home.pricing_feature_2') }}
                        </li>
                        <li class="flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 shrink-0 text-lime-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
                            {{ __('public.home.pricing_feature_3') }}
                        </li>
                        <li class="flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 shrink-0 text-lime-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
                            {{ __('public.home.pricing_feature_4') }}
                        </li>
                    </ul>
                    <div class="mt-8">
                        <a href="/register" class="inline-flex h-11 w-full items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground transition hover:bg-primary/90">
                            {{ __('public.home.pricing_cta') }}
                        </a>
                    </div>
                    <p class="mt-4 text-xs text-muted-foreground">{{ __('public.home.pricing_note') }}</p>
                    <p class="mt-2 text-xs text-muted-foreground">{{ __('public.home.pricing_ai_disclaimer') }}</p>
                </div>
            </div>
        </div>
    </section>

    {{-- CTA --}}
    <section class="border-t border-border bg-secondary/30 py-20 md:py-28">
        <div class="mx-auto max-w-6xl px-6 text-center">
            <h2 class="text-3xl font-bold tracking-tight md:text-4xl">{{ __('public.home.cta_title') }}</h2>
            <p class="mx-auto mt-4 max-w-xl text-muted-foreground">{{ __('public.home.cta_text') }}</p>
            <div class="mt-10">
                <a href="/register" class="inline-flex h-11 items-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground transition hover:bg-primary/90">
                    {{ __('public.home.cta_primary') }}
                </a>
            </div>
        </div>
    </section>

</x-layouts.public>

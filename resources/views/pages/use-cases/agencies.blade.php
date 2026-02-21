<x-layouts.public :title="__('public.agencies.title')">

    {{-- Hero --}}
    <section class="py-20 md:py-28">
        <div class="mx-auto max-w-6xl px-6">
            <div class="mx-auto max-w-3xl text-center">
                <div class="mb-6 inline-flex items-center rounded-full border border-border bg-secondary px-4 py-1.5 text-xs font-medium text-muted-foreground">
                    {{ __('public.agencies.badge') }}
                </div>
                <h1 class="text-4xl font-bold tracking-tight md:text-5xl">
                    {{ __('public.agencies.headline') }}
                </h1>
                <p class="mt-6 text-lg text-muted-foreground">
                    {{ __('public.agencies.subheadline') }}
                </p>
                <div class="mt-10">
                    <a href="/register" class="inline-flex h-11 items-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition hover:bg-primary/90">
                        {{ __('public.agencies.cta') }}
                    </a>
                </div>
                <div class="mx-auto mt-16 max-w-4xl overflow-hidden rounded-xl border border-border shadow-lg">
                    <img src="/images/hero-agencies.svg" alt="{{ __('public.agencies.badge') }}" class="w-full">
                </div>
            </div>
        </div>
    </section>

    {{-- Pain Points --}}
    <section class="border-t border-border bg-secondary/30 py-20 md:py-28">
        <div class="mx-auto max-w-6xl px-6">
            <h2 class="text-center text-3xl font-bold tracking-tight">{{ __('public.agencies.pain_title') }}</h2>
            <div class="mt-16 grid gap-8 md:grid-cols-3">
                <div class="rounded-lg border border-border bg-card p-6">
                    <div class="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-destructive/10 text-destructive">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
                    </div>
                    <h3 class="font-semibold">{{ __('public.agencies.pain_1_title') }}</h3>
                    <p class="mt-2 text-sm text-muted-foreground">{{ __('public.agencies.pain_1_text') }}</p>
                </div>
                <div class="rounded-lg border border-border bg-card p-6">
                    <div class="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-destructive/10 text-destructive">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" /></svg>
                    </div>
                    <h3 class="font-semibold">{{ __('public.agencies.pain_2_title') }}</h3>
                    <p class="mt-2 text-sm text-muted-foreground">{{ __('public.agencies.pain_2_text') }}</p>
                </div>
                <div class="rounded-lg border border-border bg-card p-6">
                    <div class="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-destructive/10 text-destructive">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                    </div>
                    <h3 class="font-semibold">{{ __('public.agencies.pain_3_title') }}</h3>
                    <p class="mt-2 text-sm text-muted-foreground">{{ __('public.agencies.pain_3_text') }}</p>
                </div>
            </div>
        </div>
    </section>

    {{-- Solutions --}}
    <section class="py-20 md:py-28">
        <div class="mx-auto max-w-6xl px-6">
            <h2 class="text-center text-3xl font-bold tracking-tight">{{ __('public.agencies.solutions_title') }}</h2>
            <div class="mt-16 space-y-16">
                <div class="flex flex-col items-center gap-8 md:flex-row">
                    <div class="flex-1">
                        <div class="mb-2 text-sm font-semibold uppercase tracking-wider text-lime-600">{{ __('public.agencies.sol_1_label') }}</div>
                        <h3 class="text-2xl font-bold">{{ __('public.agencies.sol_1_title') }}</h3>
                        <p class="mt-4 text-muted-foreground">{{ __('public.agencies.sol_1_text') }}</p>
                    </div>
                    <div class="flex-1 overflow-hidden rounded-lg border border-border">
                        <img src="/images/agent-workflow.svg" alt="{{ __('public.agencies.sol_1_placeholder') }}" class="w-full">
                    </div>
                </div>
                <div class="flex flex-col-reverse items-center gap-8 md:flex-row">
                    <div class="flex-1 overflow-hidden rounded-lg border border-border">
                        <img src="/images/budget-dashboard.svg" alt="{{ __('public.agencies.sol_2_placeholder') }}" class="w-full">
                    </div>
                    <div class="flex-1">
                        <div class="mb-2 text-sm font-semibold uppercase tracking-wider text-lime-600">{{ __('public.agencies.sol_2_label') }}</div>
                        <h3 class="text-2xl font-bold">{{ __('public.agencies.sol_2_title') }}</h3>
                        <p class="mt-4 text-muted-foreground">{{ __('public.agencies.sol_2_text') }}</p>
                    </div>
                </div>
                <div class="flex flex-col items-center gap-8 md:flex-row">
                    <div class="flex-1">
                        <div class="mb-2 text-sm font-semibold uppercase tracking-wider text-lime-600">{{ __('public.agencies.sol_3_label') }}</div>
                        <h3 class="text-2xl font-bold">{{ __('public.agencies.sol_3_title') }}</h3>
                        <p class="mt-4 text-muted-foreground">{{ __('public.agencies.sol_3_text') }}</p>
                    </div>
                    <div class="flex-1 overflow-hidden rounded-lg border border-border">
                        <img src="/images/playbook-template.svg" alt="{{ __('public.agencies.sol_3_placeholder') }}" class="w-full">
                    </div>
                </div>
            </div>
        </div>
    </section>

    {{-- CTA --}}
    <section class="border-t border-border bg-secondary/30 py-20">
        <div class="mx-auto max-w-6xl px-6 text-center">
            <h2 class="text-3xl font-bold tracking-tight">{{ __('public.agencies.cta_title') }}</h2>
            <p class="mx-auto mt-4 max-w-xl text-muted-foreground">{{ __('public.agencies.cta_text') }}</p>
            <div class="mt-10">
                <a href="/register" class="inline-flex h-11 items-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground transition hover:bg-primary/90">
                    {{ __('public.agencies.cta_button') }}
                </a>
            </div>
        </div>
    </section>

</x-layouts.public>

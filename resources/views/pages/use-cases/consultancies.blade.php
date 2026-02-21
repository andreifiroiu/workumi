<x-layouts.public :title="__('public.consultancies.title')">

    {{-- Hero --}}
    <section class="py-20 md:py-28">
        <div class="mx-auto max-w-6xl px-6">
            <div class="mx-auto max-w-3xl text-center">
                <div class="mb-6 inline-flex items-center rounded-full border border-border bg-secondary px-4 py-1.5 text-xs font-medium text-muted-foreground">
                    {{ __('public.consultancies.badge') }}
                </div>
                <h1 class="text-4xl font-bold tracking-tight md:text-5xl">
                    {{ __('public.consultancies.headline') }}
                </h1>
                <p class="mt-6 text-lg text-muted-foreground">
                    {{ __('public.consultancies.subheadline') }}
                </p>
                <div class="mt-10">
                    <a href="/register" class="inline-flex h-11 items-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition hover:bg-primary/90">
                        {{ __('public.consultancies.cta') }}
                    </a>
                </div>
                <div class="mx-auto mt-16 max-w-4xl overflow-hidden rounded-xl border border-border shadow-lg">
                    <img src="/images/hero-consultancies.svg" alt="{{ __('public.consultancies.badge') }}" class="w-full">
                </div>
            </div>
        </div>
    </section>

    {{-- Pain Points --}}
    <section class="border-t border-border bg-secondary/30 py-20 md:py-28">
        <div class="mx-auto max-w-6xl px-6">
            <h2 class="text-center text-3xl font-bold tracking-tight">{{ __('public.consultancies.pain_title') }}</h2>
            <div class="mt-16 grid gap-8 md:grid-cols-3">
                <div class="rounded-lg border border-border bg-card p-6">
                    <div class="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-destructive/10 text-destructive">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    </div>
                    <h3 class="font-semibold">{{ __('public.consultancies.pain_1_title') }}</h3>
                    <p class="mt-2 text-sm text-muted-foreground">{{ __('public.consultancies.pain_1_text') }}</p>
                </div>
                <div class="rounded-lg border border-border bg-card p-6">
                    <div class="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-destructive/10 text-destructive">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                    </div>
                    <h3 class="font-semibold">{{ __('public.consultancies.pain_2_title') }}</h3>
                    <p class="mt-2 text-sm text-muted-foreground">{{ __('public.consultancies.pain_2_text') }}</p>
                </div>
                <div class="rounded-lg border border-border bg-card p-6">
                    <div class="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-destructive/10 text-destructive">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                    </div>
                    <h3 class="font-semibold">{{ __('public.consultancies.pain_3_title') }}</h3>
                    <p class="mt-2 text-sm text-muted-foreground">{{ __('public.consultancies.pain_3_text') }}</p>
                </div>
            </div>
        </div>
    </section>

    {{-- Solutions --}}
    <section class="py-20 md:py-28">
        <div class="mx-auto max-w-6xl px-6">
            <h2 class="text-center text-3xl font-bold tracking-tight">{{ __('public.consultancies.solutions_title') }}</h2>
            <div class="mt-16 space-y-16">
                <div class="flex flex-col items-center gap-8 md:flex-row">
                    <div class="flex-1">
                        <div class="mb-2 text-sm font-semibold uppercase tracking-wider text-lime-600">{{ __('public.consultancies.sol_1_label') }}</div>
                        <h3 class="text-2xl font-bold">{{ __('public.consultancies.sol_1_title') }}</h3>
                        <p class="mt-4 text-muted-foreground">{{ __('public.consultancies.sol_1_text') }}</p>
                    </div>
                    <div class="flex-1 overflow-hidden rounded-lg border border-border">
                        <img src="/images/sop-playbook.svg" alt="{{ __('public.consultancies.sol_1_placeholder') }}" class="w-full">
                    </div>
                </div>
                <div class="flex flex-col-reverse items-center gap-8 md:flex-row">
                    <div class="flex-1 overflow-hidden rounded-lg border border-border">
                        <img src="/images/communication-thread.svg" alt="{{ __('public.consultancies.sol_2_placeholder') }}" class="w-full">
                    </div>
                    <div class="flex-1">
                        <div class="mb-2 text-sm font-semibold uppercase tracking-wider text-lime-600">{{ __('public.consultancies.sol_2_label') }}</div>
                        <h3 class="text-2xl font-bold">{{ __('public.consultancies.sol_2_title') }}</h3>
                        <p class="mt-4 text-muted-foreground">{{ __('public.consultancies.sol_2_text') }}</p>
                    </div>
                </div>
                <div class="flex flex-col items-center gap-8 md:flex-row">
                    <div class="flex-1">
                        <div class="mb-2 text-sm font-semibold uppercase tracking-wider text-lime-600">{{ __('public.consultancies.sol_3_label') }}</div>
                        <h3 class="text-2xl font-bold">{{ __('public.consultancies.sol_3_title') }}</h3>
                        <p class="mt-4 text-muted-foreground">{{ __('public.consultancies.sol_3_text') }}</p>
                    </div>
                    <div class="flex-1 overflow-hidden rounded-lg border border-border">
                        <img src="/images/profitability-dashboard.svg" alt="{{ __('public.consultancies.sol_3_placeholder') }}" class="w-full">
                    </div>
                </div>
            </div>
        </div>
    </section>

    {{-- CTA --}}
    <section class="border-t border-border bg-secondary/30 py-20">
        <div class="mx-auto max-w-6xl px-6 text-center">
            <h2 class="text-3xl font-bold tracking-tight">{{ __('public.consultancies.cta_title') }}</h2>
            <p class="mx-auto mt-4 max-w-xl text-muted-foreground">{{ __('public.consultancies.cta_text') }}</p>
            <div class="mt-10">
                <a href="/register" class="inline-flex h-11 items-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground transition hover:bg-primary/90">
                    {{ __('public.consultancies.cta_button') }}
                </a>
            </div>
        </div>
    </section>

</x-layouts.public>

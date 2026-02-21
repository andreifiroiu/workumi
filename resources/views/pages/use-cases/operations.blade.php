<x-layouts.public :title="__('public.operations.title')">

    {{-- Hero --}}
    <section class="py-20 md:py-28">
        <div class="mx-auto max-w-6xl px-6">
            <div class="mx-auto max-w-3xl text-center">
                <div class="mb-6 inline-flex items-center rounded-full border border-border bg-secondary px-4 py-1.5 text-xs font-medium text-muted-foreground">
                    {{ __('public.operations.badge') }}
                </div>
                <h1 class="text-4xl font-bold tracking-tight md:text-5xl">
                    {{ __('public.operations.headline') }}
                </h1>
                <p class="mt-6 text-lg text-muted-foreground">
                    {{ __('public.operations.subheadline') }}
                </p>
                <div class="mt-10">
                    <a href="/register" class="inline-flex h-11 items-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition hover:bg-primary/90">
                        {{ __('public.operations.cta') }}
                    </a>
                </div>
                <div class="mx-auto mt-16 max-w-4xl overflow-hidden rounded-xl border border-border shadow-lg">
                    <img src="/images/hero-operations.svg" alt="{{ __('public.operations.badge') }}" class="w-full">
                </div>
            </div>
        </div>
    </section>

    {{-- Pain Points --}}
    <section class="border-t border-border bg-secondary/30 py-20 md:py-28">
        <div class="mx-auto max-w-6xl px-6">
            <h2 class="text-center text-3xl font-bold tracking-tight">{{ __('public.operations.pain_title') }}</h2>
            <div class="mt-16 grid gap-8 md:grid-cols-3">
                <div class="rounded-lg border border-border bg-card p-6">
                    <div class="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-destructive/10 text-destructive">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
                    </div>
                    <h3 class="font-semibold">{{ __('public.operations.pain_1_title') }}</h3>
                    <p class="mt-2 text-sm text-muted-foreground">{{ __('public.operations.pain_1_text') }}</p>
                </div>
                <div class="rounded-lg border border-border bg-card p-6">
                    <div class="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-destructive/10 text-destructive">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <h3 class="font-semibold">{{ __('public.operations.pain_2_title') }}</h3>
                    <p class="mt-2 text-sm text-muted-foreground">{{ __('public.operations.pain_2_text') }}</p>
                </div>
                <div class="rounded-lg border border-border bg-card p-6">
                    <div class="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-destructive/10 text-destructive">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <h3 class="font-semibold">{{ __('public.operations.pain_3_title') }}</h3>
                    <p class="mt-2 text-sm text-muted-foreground">{{ __('public.operations.pain_3_text') }}</p>
                </div>
            </div>
        </div>
    </section>

    {{-- Solutions --}}
    <section class="py-20 md:py-28">
        <div class="mx-auto max-w-6xl px-6">
            <h2 class="text-center text-3xl font-bold tracking-tight">{{ __('public.operations.solutions_title') }}</h2>
            <div class="mt-16 space-y-16">
                <div class="flex flex-col items-center gap-8 md:flex-row">
                    <div class="flex-1">
                        <div class="mb-2 text-sm font-semibold uppercase tracking-wider text-lime-600">{{ __('public.operations.sol_1_label') }}</div>
                        <h3 class="text-2xl font-bold">{{ __('public.operations.sol_1_title') }}</h3>
                        <p class="mt-4 text-muted-foreground">{{ __('public.operations.sol_1_text') }}</p>
                    </div>
                    <div class="flex-1 overflow-hidden rounded-lg border border-border">
                        <img src="/images/dispatcher-workflow.svg" alt="{{ __('public.operations.sol_1_placeholder') }}" class="w-full">
                    </div>
                </div>
                <div class="flex flex-col-reverse items-center gap-8 md:flex-row">
                    <div class="flex-1 overflow-hidden rounded-lg border border-border">
                        <img src="/images/approval-stages.svg" alt="{{ __('public.operations.sol_2_placeholder') }}" class="w-full">
                    </div>
                    <div class="flex-1">
                        <div class="mb-2 text-sm font-semibold uppercase tracking-wider text-lime-600">{{ __('public.operations.sol_2_label') }}</div>
                        <h3 class="text-2xl font-bold">{{ __('public.operations.sol_2_title') }}</h3>
                        <p class="mt-4 text-muted-foreground">{{ __('public.operations.sol_2_text') }}</p>
                    </div>
                </div>
                <div class="flex flex-col items-center gap-8 md:flex-row">
                    <div class="flex-1">
                        <div class="mb-2 text-sm font-semibold uppercase tracking-wider text-lime-600">{{ __('public.operations.sol_3_label') }}</div>
                        <h3 class="text-2xl font-bold">{{ __('public.operations.sol_3_title') }}</h3>
                        <p class="mt-4 text-muted-foreground">{{ __('public.operations.sol_3_text') }}</p>
                    </div>
                    <div class="flex-1 overflow-hidden rounded-lg border border-border">
                        <img src="/images/integration-diagram.svg" alt="{{ __('public.operations.sol_3_placeholder') }}" class="w-full">
                    </div>
                </div>
            </div>
        </div>
    </section>

    {{-- CTA --}}
    <section class="border-t border-border bg-secondary/30 py-20">
        <div class="mx-auto max-w-6xl px-6 text-center">
            <h2 class="text-3xl font-bold tracking-tight">{{ __('public.operations.cta_title') }}</h2>
            <p class="mx-auto mt-4 max-w-xl text-muted-foreground">{{ __('public.operations.cta_text') }}</p>
            <div class="mt-10">
                <a href="/register" class="inline-flex h-11 items-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground transition hover:bg-primary/90">
                    {{ __('public.operations.cta_button') }}
                </a>
            </div>
        </div>
    </section>

</x-layouts.public>

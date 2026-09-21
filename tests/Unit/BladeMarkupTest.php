<?php

/**
 * A filesystem lint over the view directory. It boots no application, so it
 * resolves the path itself rather than through resource_path().
 */
function viewsPath(string $path = ''): string
{
    return dirname(__DIR__, 2).'/resources/views'.($path === '' ? '' : '/'.$path);
}

/**
 * JSON-LD belongs in App\Services\Seo\StructuredData, never inline in a
 * template. Blade compiles a leading `@` as a directive, so a graph written
 * into a view ships its context key to production as raw PHP.
 */
it('has no hand-written JSON-LD in any Blade template', function () {
    $offenders = [];

    foreach (glob(viewsPath('{,*/,*/*/,*/*/*/}*.blade.php'), GLOB_BRACE) as $file) {
        $contents = (string) file_get_contents($file);

        // Strip Blade comments: they are removed before directives compile,
        // so a mention of the problem in a comment is not the problem.
        $contents = preg_replace('/\{\{--.*?--\}\}/s', '', $contents) ?? $contents;

        if (preg_match('/["\']@context["\']|@context\s*:/', $contents)) {
            $offenders[] = str_replace(viewsPath().'/', '', $file);
        }
    }

    expect($offenders)->toBe([]);
});

it('emits structured data through a variable, so it is built in PHP', function () {
    $layout = (string) file_get_contents(viewsPath('components/layouts/public.blade.php'));

    expect($layout)
        ->toContain('<script type="application/ld+json">')
        ->toContain('{!! $structuredData !!}');
});

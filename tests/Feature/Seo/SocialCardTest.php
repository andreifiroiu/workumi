<?php

it('ships a social card at the size every network crops to', function () {
    $path = public_path((string) config('seo.meta.image'));

    expect(file_exists($path))->toBeTrue("the og:image referenced by config/seo.php is missing: {$path}");

    [$width, $height, $type] = getimagesize($path);

    // 1200x630 is the 1.91:1 box Facebook, LinkedIn and X all crop to; an SVG
    // would be ignored by all three.
    expect($width)->toBe(1200)
        ->and($height)->toBe(630)
        ->and($type)->toBe(IMAGETYPE_PNG);
});

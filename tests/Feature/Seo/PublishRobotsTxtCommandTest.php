<?php

use App\Services\Seo\RobotsTxt;
use Illuminate\Support\Facades\Log;

beforeEach(function () {
    // A temp path, so the run never touches the real (gitignored) public/robots.txt.
    $this->robotsPath = sys_get_temp_dir().'/workumi-robots-'.getmypid().'.txt';

    config([
        'app.url' => 'https://workumi.com',
        'seo.robots.public_hosts' => ['workumi.com'],
        'seo.robots.path' => $this->robotsPath,
    ]);
});

afterEach(function () {
    @unlink($this->robotsPath);
});

it('writes the policy for this host', function () {
    $this->artisan('seo:publish-robots')->assertSuccessful();

    expect(file_get_contents($this->robotsPath))->toBe(app(RobotsTxt::class)->body());
});

it('reports which policy it wrote', function () {
    $this->artisan('seo:publish-robots')
        ->expectsOutputToContain('public policy for workumi.com')
        ->assertSuccessful();
});

it('warns but succeeds on a closed policy outside production', function () {
    config(['app.url' => 'https://staging.workumi.com']);

    $this->artisan('seo:publish-robots')
        ->expectsOutputToContain('CLOSED policy')
        ->assertSuccessful();

    expect(file_get_contents($this->robotsPath))->toContain('Disallow: /');
});

it('fails the deploy when a production host resolves to a closed policy', function () {
    // The whole point of the fail-closed policy is that this is loud. A deploy
    // that de-indexes the site must not be able to exit 0.
    config(['app.url' => 'https://wokrumi.com']);
    app()->detectEnvironment(fn () => 'production');

    Log::shouldReceive('error')->once();

    $this->artisan('seo:publish-robots')
        ->expectsOutputToContain('This host will be de-indexed')
        ->assertFailed();
});

it('accepts a deliberately closed production host with --allow-closed', function () {
    config(['app.url' => 'https://private.workumi.com']);
    app()->detectEnvironment(fn () => 'production');

    $this->artisan('seo:publish-robots', ['--allow-closed' => true])->assertSuccessful();

    expect(file_get_contents($this->robotsPath))->toContain('Disallow: /');
});

it('overwrites a stale file rather than appending to it', function () {
    file_put_contents($this->robotsPath, str_repeat("# stale\n", 200));

    $this->artisan('seo:publish-robots')->assertSuccessful();

    expect(file_get_contents($this->robotsPath))
        ->toBe(app(RobotsTxt::class)->body())
        ->not->toContain('# stale');
});

it('leaves the previous file intact when the new one cannot be written', function () {
    file_put_contents($this->robotsPath, "# previous\n");

    // An unwritable directory: the temp file cannot be created, so the rename
    // never happens and the served file keeps its old contents.
    config(['seo.robots.path' => '/nonexistent-directory-'.getmypid().'/robots.txt']);

    $this->artisan('seo:publish-robots')->assertFailed();

    expect(file_get_contents($this->robotsPath))->toBe("# previous\n");
});

it('does not leave a temp file behind on failure', function () {
    config(['seo.robots.path' => '/nonexistent-directory-'.getmypid().'/robots.txt']);

    $this->artisan('seo:publish-robots')->assertFailed();

    expect(glob(sys_get_temp_dir().'/*.tmp'))->not->toContain($this->robotsPath.'.tmp');
});

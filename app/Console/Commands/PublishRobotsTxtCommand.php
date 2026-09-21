<?php

namespace App\Console\Commands;

use App\Services\Seo\RobotsTxt;
use ErrorException;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

/**
 * Writes public/robots.txt for the host this installation answers as.
 *
 * The file is host-specific and therefore not in git; it is produced at deploy
 * time. Run this after `composer install` in the deployment script of every
 * environment. Until it runs, `/robots.txt` falls through to the route in
 * routes/web.php, which serves the identical body.
 */
class PublishRobotsTxtCommand extends Command
{
    protected $signature = 'seo:publish-robots
                            {--allow-closed : Accept a Disallow-all policy on a production host}';

    protected $description = 'Write public/robots.txt from the robots policy for this host';

    public function handle(RobotsTxt $robots): int
    {
        $body = $robots->body();
        $path = (string) config('seo.robots.path', public_path('robots.txt'));
        $host = $robots->host() ?? '(no host in APP_URL)';

        if (! $this->write($path, $body)) {
            return self::FAILURE;
        }

        if ($robots->policy() === RobotsTxt::POLICY_OPEN) {
            $this->components->info("Wrote the public policy for {$host} to {$path}.");

            return self::SUCCESS;
        }

        /*
         * A closed policy on production is almost always a mistyped APP_URL or
         * a missing SEO_PUBLIC_HOSTS entry, and it de-indexes the site. Failing
         * the command is the point: a deploy that takes the site out of the
         * index must not be able to exit 0 and look green. A production host
         * that really is meant to be private passes --allow-closed.
         */
        /** @var array<int, string> $publicHosts */
        $publicHosts = config('seo.robots.public_hosts', []);

        // Naming the allow-list is the whole diagnosis: the operator can see at
        // a glance whether APP_URL is wrong or the host is simply missing.
        $allowed = $publicHosts === [] ? '(empty)' : implode(', ', $publicHosts);

        $message = "Wrote a CLOSED policy (Disallow: /) for {$host}: it is not in seo.robots.public_hosts [{$allowed}].";

        if (app()->isProduction() && ! $this->option('allow-closed')) {
            $this->components->error($message.' This host will be de-indexed.');
            $this->components->error(
                "Set SEO_PUBLIC_HOSTS to include {$host} (or fix APP_URL), then re-run. "
                .'Pass --allow-closed if this host really should not be indexed.'
            );

            Log::error('robots.txt published with a closed policy on a production host.', [
                'host' => $host,
                'public_hosts' => $publicHosts,
            ]);

            return self::FAILURE;
        }

        $this->components->warn($message);

        return self::SUCCESS;
    }

    /**
     * Write the body atomically.
     *
     * file_put_contents() truncates before it writes, so an interrupted write
     * leaves a file whose remaining bytes are the leading comments — and a
     * comments-only robots.txt reads to a crawler as "no rules, crawl
     * everything", on a host that was meant to be closed. Writing beside the
     * target and renaming means the served file is only ever the old body or
     * the complete new one.
     */
    protected function write(string $path, string $body): bool
    {
        $temporary = $path.'.'.getmypid().'.tmp';

        try {
            $written = file_put_contents($temporary, $body, LOCK_EX);
        } catch (ErrorException $e) {
            $this->components->error("Could not write {$temporary}: {$e->getMessage()}");

            return false;
        }

        if ($written === false || $written < strlen($body)) {
            @unlink($temporary);
            $this->components->error("Short write to {$temporary}; {$path} left unchanged.");

            return false;
        }

        if (! rename($temporary, $path)) {
            @unlink($temporary);
            $this->components->error("Could not move {$temporary} into place at {$path}.");

            return false;
        }

        return true;
    }
}

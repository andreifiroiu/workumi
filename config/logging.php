<?php

use MarvinLabs\DiscordLogger\Logger;
use Monolog\Handler\NullHandler;
use Monolog\Handler\StreamHandler;
use Monolog\Handler\SyslogUdpHandler;
use Monolog\Processor\PsrLogMessageProcessor;

return [

    /*
    |--------------------------------------------------------------------------
    | Default Log Channel
    |--------------------------------------------------------------------------
    |
    | This option defines the default log channel that is utilized to write
    | messages to your logs. The value provided here should match one of
    | the channels present in the list of "channels" configured below.
    |
    */

    'default' => env('LOG_CHANNEL', 'stack'),

    /*
    |--------------------------------------------------------------------------
    | Deprecations Log Channel
    |--------------------------------------------------------------------------
    |
    | This option controls the log channel that should be used to log warnings
    | regarding deprecated PHP and library features. This allows you to get
    | your application ready for upcoming major versions of dependencies.
    |
    */

    'deprecations' => [
        'channel' => env('LOG_DEPRECATIONS_CHANNEL', 'null'),
        'trace' => env('LOG_DEPRECATIONS_TRACE', false),
    ],

    /*
    |--------------------------------------------------------------------------
    | Log Channels
    |--------------------------------------------------------------------------
    |
    | Here you may configure the log channels for your application. Laravel
    | utilizes the Monolog PHP logging library, which includes a variety
    | of powerful log handlers and formatters that you're free to use.
    |
    | Available drivers: "single", "daily", "slack", "syslog",
    |                    "errorlog", "monolog", "custom", "stack"
    |
    */

    'channels' => [

        'stack' => [
            'driver' => 'stack',
            'channels' => explode(',', (string) env('LOG_STACK', 'single')),
            'ignore_exceptions' => false,
        ],

        'single' => [
            'driver' => 'single',
            'path' => storage_path('logs/laravel.log'),
            'level' => env('LOG_LEVEL', 'debug'),
            'replace_placeholders' => true,
        ],

        'daily' => [
            'driver' => 'daily',
            'path' => storage_path('logs/laravel.log'),
            'level' => env('LOG_LEVEL', 'debug'),
            'days' => env('LOG_DAILY_DAYS', 14),
            'replace_placeholders' => true,
        ],

        /*
        | Dedicated channel for daily task digest delivery. Kept out of the
        | application log so "did today's digest go out, and to whom?" can be
        | answered by reading one file (or one Log Viewer entry).
        |
        | It is a stack so deployments can fan digest records out to their own
        | sinks (e.g. LOG_DIGEST_STACK=digest_file,otlp) and tests can silence
        | it with LOG_DIGEST_STACK=null. Every name listed must be a real
        | channel below: there is no "null" log *driver*, and an unresolvable
        | one silently demotes writes to the emergency logger.
        */
        'digest' => [
            'driver' => 'stack',
            'channels' => explode(',', (string) env('LOG_DIGEST_STACK', 'digest_file')),
            'ignore_exceptions' => false,
        ],

        /*
        | A discard sink for the digest stack. Named rather than reusing the
        | "null" channel because env() coerces the *string* "null" to PHP null,
        | which would leave the stack empty and demote writes to the emergency
        | logger instead of discarding them.
        */
        'digest_null' => [
            'driver' => 'monolog',
            'handler' => NullHandler::class,
        ],

        'digest_file' => [
            'driver' => 'daily',
            'path' => storage_path('logs/digest.log'),
            'level' => env('LOG_DIGEST_LEVEL', 'info'),
            'days' => env('LOG_DIGEST_DAYS', 30),
            'replace_placeholders' => true,
        ],

        /*'discord' => [
            'driver'  => 'monolog',
            'level'   => env('LOG_DISCORD_LEVEL', 'error'),
            'handler' => App\Logging\DiscordWebhookHandler::class,
            'with'    => [
                'webhookUrl' => env('LOG_DISCORD_WEBHOOK_URL'),
                'username'   => env('LOG_DISCORD_USERNAME', 'Workumi Log'),
            ],
        ],*/

        'discord' => [
            'driver' => 'custom',
            'via' => Logger::class,
            'level' => 'error',
            'url' => env('LOG_DISCORD_WEBHOOK_URL'),
            'ignore_exceptions' => env('LOG_DISCORD_IGNORE_EXCEPTIONS', false),
        ],

        'slack' => [
            'driver' => 'slack',
            'url' => env('LOG_SLACK_WEBHOOK_URL'),
            'username' => env('LOG_SLACK_USERNAME', 'Workumi Log'),
            'emoji' => env('LOG_SLACK_EMOJI', ':boom:'),
            'level' => env('LOG_LEVEL', 'error'),
            'replace_placeholders' => true,
        ],

        'papertrail' => [
            'driver' => 'monolog',
            'level' => env('LOG_LEVEL', 'debug'),
            'handler' => env('LOG_PAPERTRAIL_HANDLER', SyslogUdpHandler::class),
            'handler_with' => [
                'host' => env('PAPERTRAIL_URL'),
                'port' => env('PAPERTRAIL_PORT'),
                'connectionString' => 'tls://'.env('PAPERTRAIL_URL').':'.env('PAPERTRAIL_PORT'),
            ],
            'processors' => [PsrLogMessageProcessor::class],
        ],

        'stderr' => [
            'driver' => 'monolog',
            'level' => env('LOG_LEVEL', 'debug'),
            'handler' => StreamHandler::class,
            'handler_with' => [
                'stream' => 'php://stderr',
            ],
            'formatter' => env('LOG_STDERR_FORMATTER'),
            'processors' => [PsrLogMessageProcessor::class],
        ],

        'syslog' => [
            'driver' => 'syslog',
            'level' => env('LOG_LEVEL', 'debug'),
            'facility' => env('LOG_SYSLOG_FACILITY', LOG_USER),
            'replace_placeholders' => true,
        ],

        'errorlog' => [
            'driver' => 'errorlog',
            'level' => env('LOG_LEVEL', 'debug'),
            'replace_placeholders' => true,
        ],

        'null' => [
            'driver' => 'monolog',
            'handler' => NullHandler::class,
        ],

        'emergency' => [
            'path' => storage_path('logs/laravel.log'),
        ],

    ],

];

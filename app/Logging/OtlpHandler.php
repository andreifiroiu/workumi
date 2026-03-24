<?php

namespace App\Logging;

use Monolog\Handler\AbstractProcessingHandler;
use Monolog\Level;
use Monolog\LogRecord;
use OpenTelemetry\API\Logs\LoggerProviderInterface;
use OpenTelemetry\API\Logs\LogRecord as OtelLogRecord;
use OpenTelemetry\API\Logs\Severity;
use OpenTelemetry\API\Trace\Span;
use OpenTelemetry\Context\Context;

/**
 * Monolog handler that exports logs to an OTLP endpoint via OpenTelemetry.
 *
 * This handler bridges Laravel's logging (Monolog) with OpenTelemetry's log export,
 * enabling log correlation with traces in observability backends.
 */
class OtlpHandler extends AbstractProcessingHandler
{
    private \OpenTelemetry\API\Logs\LoggerInterface $logger;

    public function __construct(
        private readonly LoggerProviderInterface $loggerProvider,
        int|string|Level $level = Level::Debug,
        bool $bubble = true,
    ) {
        parent::__construct($level, $bubble);

        $this->logger = $loggerProvider->getLogger(
            config('opentelemetry.service_name', 'workumi'),
            config('opentelemetry.service_version', '1.0.0'),
        );
    }

    /**
     * Write the log record to the OTLP endpoint.
     */
    protected function write(LogRecord $record): void
    {
        $context = Context::getCurrent();
        $span = Span::fromContext($context);
        $spanContext = $span->getContext();

        // Build attributes from the log record context and extra data
        $attributes = array_merge(
            $record->context,
            $record->extra,
            [
                'monolog.channel' => $record->channel,
                'monolog.level_name' => $record->level->name,
            ]
        );

        // Create and emit the OTLP log record
        $this->logger->emit(
            (new OtelLogRecord($record->message))
                ->setTimestamp((int) ($record->datetime->format('U.u') * 1_000_000_000))
                ->setSeverityNumber(Severity::fromPsr3($record->level->toPsrLogLevel()))
                ->setSeverityText($record->level->name)
                ->setAttributes($attributes)
                ->setContext($spanContext->isValid() ? $context : null)
        );
    }
}

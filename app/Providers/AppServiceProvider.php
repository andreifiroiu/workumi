<?php

namespace App\Providers;

use App\Events\DeliverableStatusChanged;
use App\Events\MessageCreated;
use App\Events\TaskStatusChanged;
use App\Events\WorkOrderCreated;
use App\Events\WorkOrderStatusChanged;
use App\Listeners\AgentTriggerListener;
use App\Listeners\DeliverableStatusChangedListener;
use App\Listeners\DispatcherMentionListener;
use App\Listeners\TriggerPMCopilotOnWorkOrderCreated;
use App\Listeners\WorkOrderStatusChangedListener;
use App\Models\Team;
use App\Models\TimeEntry;
use App\Observers\TeamObserver;
use App\Observers\TimeEntryObserver;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\ServiceProvider;
use OpenTelemetry\API\Globals;
use OpenTelemetry\API\Logs\LoggerProviderInterface;
use OpenTelemetry\API\Metrics\MeterProviderInterface;
use OpenTelemetry\API\Trace\TracerProviderInterface;
use OpenTelemetry\Contrib\Otlp\LogsExporter;
use OpenTelemetry\Contrib\Otlp\MetricExporter;
use OpenTelemetry\Contrib\Otlp\SpanExporter;
use OpenTelemetry\SDK\Common\Attribute\Attributes;
use OpenTelemetry\SDK\Common\Export\Http\PsrTransportFactory;
use OpenTelemetry\SDK\Common\Time\ClockFactory;
use OpenTelemetry\SDK\Logs\LoggerProvider;
use OpenTelemetry\SDK\Logs\Processor\BatchLogRecordProcessor;
use OpenTelemetry\SDK\Metrics\MeterProvider;
use OpenTelemetry\SDK\Metrics\MetricReader\ExportingReader;
use OpenTelemetry\SDK\Resource\ResourceInfo;
use OpenTelemetry\SDK\Trace\Sampler\AlwaysOnSampler;
use OpenTelemetry\SDK\Trace\Sampler\ParentBased;
use OpenTelemetry\SDK\Trace\SpanProcessor\BatchSpanProcessor;
use OpenTelemetry\SDK\Trace\TracerProvider;
use OpenTelemetry\SemConv\Attributes\ServiceAttributes;
use OpenTelemetry\SemConv\Incubating\Attributes\DeploymentIncubatingAttributes;
use OpenTelemetry\SemConv\Incubating\Attributes\ServiceIncubatingAttributes;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(TracerProviderInterface::class, function () {
            return $this->createTracerProvider();
        });

        $this->app->singleton(MeterProviderInterface::class, function () {
            return $this->createMeterProvider();
        });

        $this->app->singleton(LoggerProviderInterface::class, function () {
            return $this->createLoggerProvider();
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Register model observers
        Team::observe(TeamObserver::class);
        TimeEntry::observe(TimeEntryObserver::class);

        // Register event listeners
        Event::listen(MessageCreated::class, DispatcherMentionListener::class);
        Event::listen(WorkOrderCreated::class, TriggerPMCopilotOnWorkOrderCreated::class);
        Event::listen(WorkOrderStatusChanged::class, WorkOrderStatusChangedListener::class);
        Event::listen(DeliverableStatusChanged::class, DeliverableStatusChangedListener::class);

        // Register AgentTriggerListener for status change events (agent chain triggers)
        Event::listen(WorkOrderStatusChanged::class, [AgentTriggerListener::class, 'handleWorkOrderStatusChanged']);
        Event::listen(DeliverableStatusChanged::class, [AgentTriggerListener::class, 'handleDeliverableStatusChanged']);
        Event::listen(TaskStatusChanged::class, [AgentTriggerListener::class, 'handleTaskStatusChanged']);

        if (! config('opentelemetry.auto_instrumentation.enabled', true)) {
            return;
        }

        // Register shutdown handler to flush telemetry
        $this->app->terminating(function () {
            $tracerProvider = $this->app->make(TracerProviderInterface::class);
            if ($tracerProvider instanceof TracerProvider) {
                $tracerProvider->shutdown();
            }

            $meterProvider = $this->app->make(MeterProviderInterface::class);
            if ($meterProvider instanceof MeterProvider) {
                $meterProvider->shutdown();
            }

            $loggerProvider = $this->app->make(LoggerProviderInterface::class);
            if ($loggerProvider instanceof LoggerProvider) {
                $loggerProvider->shutdown();
            }
        });
    }

    /**
     * Create the OpenTelemetry resource with service information.
     */
    private function createResource(): ResourceInfo
    {
        $attributes = [
            ServiceAttributes::SERVICE_NAME => config('opentelemetry.service_name', 'workumi'),
            ServiceAttributes::SERVICE_VERSION => config('opentelemetry.service_version', '1.0.0'),
            DeploymentIncubatingAttributes::DEPLOYMENT_ENVIRONMENT_NAME => config('opentelemetry.resource_attributes.deployment.environment', 'production'),
            ServiceIncubatingAttributes::SERVICE_NAMESPACE => config('opentelemetry.resource_attributes.service.namespace', 'workumi'),
        ];

        return ResourceInfo::create(Attributes::create($attributes));
    }

    /**
     * Create the tracer provider for distributed tracing.
     */
    private function createTracerProvider(): TracerProviderInterface
    {
        $endpoint = config('opentelemetry.exporter.endpoint', 'http://localhost:4318');
        $tracesEndpoint = rtrim($endpoint, '/').'/v1/traces';

        $transport = PsrTransportFactory::discover()->create(
            $tracesEndpoint,
            'application/x-protobuf'
        );

        $exporter = new SpanExporter($transport);
        $processor = new BatchSpanProcessor($exporter, ClockFactory::getDefault());
        $sampler = new ParentBased(new AlwaysOnSampler);

        return TracerProvider::builder()
            ->addSpanProcessor($processor)
            ->setResource($this->createResource())
            ->setSampler($sampler)
            ->build();
    }

    /**
     * Create the meter provider for metrics collection.
     */
    private function createMeterProvider(): MeterProviderInterface
    {
        if (! config('opentelemetry.metrics.enabled', true)) {
            return Globals::meterProvider();
        }

        $endpoint = config('opentelemetry.exporter.endpoint', 'http://localhost:4318');
        $metricsEndpoint = rtrim($endpoint, '/').'/v1/metrics';

        $transport = PsrTransportFactory::discover()->create(
            $metricsEndpoint,
            'application/x-protobuf'
        );

        $exporter = new MetricExporter($transport);
        $reader = new ExportingReader($exporter);

        return MeterProvider::builder()
            ->addReader($reader)
            ->setResource($this->createResource())
            ->build();
    }

    /**
     * Create the logger provider for log export.
     */
    private function createLoggerProvider(): LoggerProviderInterface
    {
        if (! config('opentelemetry.logs.enabled', true)) {
            return Globals::loggerProvider();
        }

        $endpoint = config('opentelemetry.exporter.endpoint', 'http://localhost:4318');
        $logsEndpoint = rtrim($endpoint, '/').'/v1/logs';

        $transport = PsrTransportFactory::discover()->create(
            $logsEndpoint,
            'application/x-protobuf'
        );

        $exporter = new LogsExporter($transport);
        $processor = new BatchLogRecordProcessor($exporter, ClockFactory::getDefault());

        return LoggerProvider::builder()
            ->addLogRecordProcessor($processor)
            ->setResource($this->createResource())
            ->build();
    }
}

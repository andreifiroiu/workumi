<?php

return [

    /*
    |--------------------------------------------------------------------------
    | OpenTelemetry Service Configuration
    |--------------------------------------------------------------------------
    |
    | These values define how your application identifies itself to the
    | observability backend. The service name and version help distinguish
    | traces from different applications and deployments.
    |
    */

    'service_name' => env('OTEL_SERVICE_NAME', env('APP_NAME', 'workumi')),

    'service_version' => env('OTEL_SERVICE_VERSION', '1.0.0'),

    /*
    |--------------------------------------------------------------------------
    | OTLP Exporter Configuration
    |--------------------------------------------------------------------------
    |
    | Configure the endpoint and protocol for exporting telemetry data.
    | The endpoint should point to your OTLP collector (Jaeger, Tempo, etc.)
    |
    | Supported protocols: grpc, http/protobuf, http/json
    |
    */

    'exporter' => [
        'endpoint' => env('OTEL_EXPORTER_OTLP_ENDPOINT', 'http://localhost:4318'),
        'protocol' => env('OTEL_EXPORTER_OTLP_PROTOCOL', 'http/protobuf'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Traces Configuration
    |--------------------------------------------------------------------------
    |
    | Configure trace sampling and export behavior. The sampler determines
    | which traces are recorded and exported.
    |
    | Supported samplers:
    | - always_on: Record all traces
    | - always_off: Record no traces
    | - parentbased_always_on: Follow parent decision, default to on
    | - parentbased_always_off: Follow parent decision, default to off
    | - traceidratio: Sample based on trace ID ratio (use with sampler_arg)
    |
    */

    'traces' => [
        'sampler' => env('OTEL_TRACES_SAMPLER', 'parentbased_always_on'),
        'sampler_arg' => env('OTEL_TRACES_SAMPLER_ARG', '1.0'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Metrics Configuration
    |--------------------------------------------------------------------------
    |
    | Configure metrics collection interval and export behavior.
    |
    */

    'metrics' => [
        'enabled' => env('OTEL_METRICS_ENABLED', true),
        'interval' => env('OTEL_METRIC_EXPORT_INTERVAL', 60000), // milliseconds
    ],

    /*
    |--------------------------------------------------------------------------
    | Logs Configuration
    |--------------------------------------------------------------------------
    |
    | Configure log export to OTLP. When enabled, logs will include
    | trace context (trace_id, span_id) for correlation.
    |
    */

    'logs' => [
        'enabled' => env('OTEL_LOGS_ENABLED', true),
    ],

    /*
    |--------------------------------------------------------------------------
    | Resource Attributes
    |--------------------------------------------------------------------------
    |
    | Additional attributes to attach to all telemetry data. These help
    | identify the source and context of the telemetry.
    |
    */

    'resource_attributes' => [
        'deployment.environment' => env('APP_ENV', 'production'),
        'service.namespace' => env('OTEL_SERVICE_NAMESPACE', 'workumi'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Auto-Instrumentation
    |--------------------------------------------------------------------------
    |
    | Enable or disable automatic instrumentation for various components.
    | The OTEL PHP auto-instrumentation packages will automatically
    | instrument Laravel, PDO, and HTTP clients when enabled.
    |
    */

    'auto_instrumentation' => [
        'enabled' => env('OTEL_PHP_AUTOLOAD_ENABLED', true),
    ],

];

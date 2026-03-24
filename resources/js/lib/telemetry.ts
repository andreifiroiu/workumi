import { context, trace, SpanStatusCode, type Span, type Tracer } from '@opentelemetry/api';
import { ZoneContextManager } from '@opentelemetry/context-zone';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { DocumentLoadInstrumentation } from '@opentelemetry/instrumentation-document-load';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { BatchSpanProcessor, WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { registerInstrumentations } from '@opentelemetry/instrumentation';

/**
 * OpenTelemetry configuration for the frontend application.
 *
 * This module initializes distributed tracing for the React frontend,
 * enabling correlation with backend traces via propagated trace context.
 */

const OTEL_ENABLED = import.meta.env.VITE_OTEL_ENABLED !== 'false' && import.meta.env.VITE_OTEL_ENABLED !== false;
const OTEL_ENDPOINT = import.meta.env.VITE_OTEL_EXPORTER_ENDPOINT || 'http://localhost:4318';
const SERVICE_NAME = import.meta.env.VITE_OTEL_SERVICE_NAME || 'workumi-frontend';
const SERVICE_VERSION = import.meta.env.VITE_APP_VERSION || '1.0.0';

let provider: WebTracerProvider | null = null;
let tracer: Tracer | null = null;

/**
 * Initialize OpenTelemetry for the browser.
 *
 * Sets up the WebTracerProvider with OTLP HTTP exporter and auto-instrumentation
 * for fetch requests and document load events.
 */
export function initTelemetry(): void {
    // Skip in SSR or if already initialized
    if (typeof window === 'undefined' || provider !== null) {
        return;
    }

    if (!OTEL_ENABLED) {
        return;
    }

    // Create resource with service identification
    const resource = resourceFromAttributes({
        [ATTR_SERVICE_NAME]: SERVICE_NAME,
        [ATTR_SERVICE_VERSION]: SERVICE_VERSION,
        'deployment.environment': import.meta.env.MODE || 'development',
    });

    // Configure OTLP exporter to send traces to the collector
    const exporter = new OTLPTraceExporter({
        url: `${OTEL_ENDPOINT}/v1/traces`,
        headers: {},
    });

    // Create and configure the tracer provider
    provider = new WebTracerProvider({
        resource,
        spanProcessors: [new BatchSpanProcessor(exporter)],
    });

    // Use ZoneContextManager for async context propagation
    provider.register({
        contextManager: new ZoneContextManager(),
    });

    // Register auto-instrumentation for fetch and document load
    registerInstrumentations({
        instrumentations: [
            new FetchInstrumentation({
                // Propagate trace context to same-origin requests
                propagateTraceHeaderCorsUrls: [
                    // Match same-origin requests (Inertia calls)
                    new RegExp(`^${window.location.origin}`),
                ],
                // Add useful attributes to fetch spans
                applyCustomAttributesOnSpan: (span, request, response) => {
                    if (request instanceof Request) {
                        span.setAttribute('http.url', request.url);
                    }
                    if (response instanceof Response) {
                        span.setAttribute('http.status_code', response.status);
                    }
                },
            }),
            new DocumentLoadInstrumentation(),
        ],
    });

    // Get the tracer instance
    tracer = trace.getTracer(SERVICE_NAME, SERVICE_VERSION);

    console.debug('[OTEL] Telemetry initialized', {
        endpoint: OTEL_ENDPOINT,
        service: SERVICE_NAME,
    });
}

/**
 * Get the configured tracer instance.
 *
 * @returns The tracer instance, or null if telemetry is not initialized.
 */
export function getTracer(): Tracer | null {
    return tracer;
}

/**
 * Create and start a new span for custom instrumentation.
 *
 * @param name - The name of the span
 * @param fn - The function to execute within the span context
 * @returns The result of the function
 *
 * @example
 * ```ts
 * const result = await withSpan('fetchUserData', async (span) => {
 *     span.setAttribute('user.id', userId);
 *     const data = await fetchUser(userId);
 *     return data;
 * });
 * ```
 */
export async function withSpan<T>(
    name: string,
    fn: (span: Span) => Promise<T>,
): Promise<T> {
    if (!tracer) {
        return fn({} as Span);
    }

    const span = tracer.startSpan(name);

    try {
        const result = await context.with(trace.setSpan(context.active(), span), () => fn(span));
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
    } catch (error) {
        span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error instanceof Error ? error.message : 'Unknown error',
        });
        span.recordException(error instanceof Error ? error : new Error(String(error)));
        throw error;
    } finally {
        span.end();
    }
}

/**
 * Create a synchronous span for custom instrumentation.
 *
 * @param name - The name of the span
 * @param fn - The function to execute within the span context
 * @returns The result of the function
 */
export function withSpanSync<T>(
    name: string,
    fn: (span: Span) => T,
): T {
    if (!tracer) {
        return fn({} as Span);
    }

    const span = tracer.startSpan(name);

    try {
        const result = context.with(trace.setSpan(context.active(), span), () => fn(span));
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
    } catch (error) {
        span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error instanceof Error ? error.message : 'Unknown error',
        });
        span.recordException(error instanceof Error ? error : new Error(String(error)));
        throw error;
    } finally {
        span.end();
    }
}

// Auto-initialize telemetry when the module is imported
initTelemetry();

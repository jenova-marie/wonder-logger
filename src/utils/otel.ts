/**
 * OpenTelemetry Configuration for RecoverySky Zoom Microservices
 *
 * This module configures distributed tracing, metrics, and instrumentation
 * for the entire microservices architecture. It should be imported FIRST
 * before any other modules to ensure proper auto-instrumentation.
 *
 * Features:
 * - Automatic instrumentation for Express, HTTP, databases, Redis
 * - Distributed tracing with trace context propagation
 * - Custom business logic spans and metrics
 * - Integration with Grafana Tempo, Prometheus, and Loki
 *
 * @example
 * // In your main server.ts - IMPORT FIRST!
 * import './otel';
 * import express from 'express'; // Now auto-instrumented
 *
 * @requires - This module requires OpenTelemetry packages to be installed:
 * pnpm add @opentelemetry/sdk-node @opentelemetry/resources \
 *   @opentelemetry/auto-instrumentations-node @opentelemetry/sdk-metrics \
 *   @opentelemetry/semantic-conventions @opentelemetry/exporter-trace-otlp-http \
 *   @opentelemetry/exporter-jaeger @opentelemetry/sdk-trace-base \
 *   @opentelemetry/exporter-metrics-otlp-http @opentelemetry/exporter-prometheus \
 *   @opentelemetry/api
 */

import { NodeSDK } from "@opentelemetry/sdk-node";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import {
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";

// Trace Exporters
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { JaegerExporter } from "@opentelemetry/exporter-jaeger";
import { ConsoleSpanExporter } from "@opentelemetry/sdk-trace-base";

// Metric Exporters
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { PrometheusExporter } from "@opentelemetry/exporter-prometheus";

// API
import { trace, metrics } from "@opentelemetry/api";

// Types
import type { Span, Tracer, Meter } from "@opentelemetry/api";

interface ExporterHeaders {
  [key: string]: string;
}

class RecoverySkyTelemetry {
  private serviceName: string;
  private serviceVersion: string;
  private environment: string;
  private sdk: NodeSDK | null;
  private tracer: Tracer | null;
  private meter: Meter | null;

  constructor() {
    this.serviceName =
      process.env.OTEL_SERVICE_NAME || "recoverysky-zoom-unknown";
    this.serviceVersion = process.env.OTEL_SERVICE_VERSION || "1.0.0";
    this.environment = process.env.NODE_ENV || "development";

    this.sdk = null;
    this.tracer = null;
    this.meter = null;
  }

  /**
   * Initialize OpenTelemetry SDK with auto-instrumentation
   */
  init(): void {
    if (this.sdk) {
      console.warn("OpenTelemetry already initialized");
      return;
    }

    const resource = resourceFromAttributes({
      [SEMRESATTRS_SERVICE_NAME]: this.serviceName,
      [SEMRESATTRS_SERVICE_VERSION]: this.serviceVersion,
      environment: this.environment,
      application: "recoverysky-zoom",
    });

    this.sdk = new NodeSDK({
      resource,
      traceExporter: this.createTraceExporter(),
      metricReader: this.createMetricReader(),
      instrumentations: [
        getNodeAutoInstrumentations({
          // Disable noisy instrumentations in development
          "@opentelemetry/instrumentation-fs": { enabled: false },
          "@opentelemetry/instrumentation-dns": { enabled: false },
          "@opentelemetry/instrumentation-net": { enabled: false },

          // NOTE: HTTP instrumentation hooks (requestHook/responseHook) are not unit-tested
          // because they require actual HTTP requests and OTEL spans to be meaningful.
          // These are covered by integration tests where real HTTP traffic flows through
          // the instrumented Express application.
          "@opentelemetry/instrumentation-http": {
            requestHook: this.httpRequestHook.bind(this),
            responseHook: this.httpResponseHook.bind(this),
          },

          // Express instrumentation
          "@opentelemetry/instrumentation-express": {
            enabled: true,
          },

          // Database instrumentations
          "@opentelemetry/instrumentation-redis": { enabled: true },
          "@opentelemetry/instrumentation-mongodb": { enabled: true },
          "@opentelemetry/instrumentation-mysql2": { enabled: true },
          "@opentelemetry/instrumentation-pg": { enabled: true },
        }),
      ],
    });

    // Start the SDK
    this.sdk.start();

    // Initialize tracer and meter for custom instrumentation
    this.tracer = trace.getTracer(this.serviceName, this.serviceVersion);
    this.meter = metrics.getMeter(this.serviceName, this.serviceVersion);

    console.log(`OpenTelemetry initialized for service: ${this.serviceName}`);
  }

  /**
   * Create trace exporter based on environment configuration
   */
  private createTraceExporter():
    | ConsoleSpanExporter
    | OTLPTraceExporter
    | JaegerExporter {
    const exporterType = process.env.OTEL_TRACE_EXPORTER || "console";

    switch (exporterType) {
      case "otlp":
        return new OTLPTraceExporter({
          url:
            process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ||
            "http://localhost:4318/v1/traces",
          headers: this.getExporterHeaders(),
        });

      case "jaeger":
        return new JaegerExporter({
          endpoint:
            process.env.OTEL_EXPORTER_JAEGER_ENDPOINT ||
            "http://localhost:14268/api/traces",
        });

      case "console":
      default:
        return new ConsoleSpanExporter();
    }
  }

  /**
   * Create metric reader based on environment configuration
   */
  private createMetricReader():
    | PeriodicExportingMetricReader
    | PrometheusExporter {
    const exporterType = process.env.OTEL_METRIC_EXPORTER || "prometheus";

    switch (exporterType) {
      case "otlp":
        return new PeriodicExportingMetricReader({
          exporter: new OTLPMetricExporter({
            url:
              process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT ||
              "http://localhost:4318/v1/metrics",
            headers: this.getExporterHeaders(),
          }),
          exportIntervalMillis:
            parseInt(process.env.OTEL_METRIC_EXPORT_INTERVAL || "60000") ||
            60000,
        });

      case "prometheus":
      default:
        return new PrometheusExporter({
          port: parseInt(process.env.OTEL_PROMETHEUS_PORT || "9090") || 9090,
          endpoint: process.env.OTEL_PROMETHEUS_ENDPOINT || "/metrics",
        });
    }
  }

  /**
   * Get headers for OTLP exporters
   */
  private getExporterHeaders(): ExporterHeaders {
    const headers: ExporterHeaders = {};

    if (process.env.OTEL_EXPORTER_OTLP_HEADERS) {
      try {
        Object.assign(
          headers,
          JSON.parse(process.env.OTEL_EXPORTER_OTLP_HEADERS),
        );
      } catch (e) {
        console.warn(
          "Invalid OTEL_EXPORTER_OTLP_HEADERS JSON:",
          process.env.OTEL_EXPORTER_OTLP_HEADERS,
        );
      }
    }

    return headers;
  }

  /**
   * HTTP request hook for adding custom attributes
   *
   * NOTE: This method is not unit-tested because it requires actual HTTP request objects
   * from the @opentelemetry/instrumentation-http package and active OTEL spans.
   * Covered by integration tests with real Express HTTP requests.
   */
  private httpRequestHook(span: Span, request: any): void {
    span.setAttributes({
      "http.user_agent": request.getHeader("user-agent") || "unknown",
      "http.x_forwarded_for": request.getHeader("x-forwarded-for"),
      "http.x_request_id": request.getHeader("x-request-id"),
      "http.x_correlation_id": request.getHeader("x-correlation-id"),
    });
  }

  /**
   * HTTP response hook for adding response attributes
   *
   * NOTE: This method is not unit-tested because it requires actual HTTP response objects
   * from the @opentelemetry/instrumentation-http package and active OTEL spans.
   * Covered by integration tests with real Express HTTP responses.
   */
  private httpResponseHook(span: Span, response: any): void {
    span.setAttributes({
      "http.response_content_length": response.getHeader("content-length"),
      "http.response_content_type": response.getHeader("content-type"),
    });
  }

  /**
   * Create custom span for business logic
   * @param {string} name - Span name
   * @param {Object} attributes - Span attributes
   * @param {Function} fn - Function to execute within span
   */
  async withSpan<T>(
    name: string,
    attributes: Record<string, any> = {},
    fn: (span: Span) => Promise<T>,
  ): Promise<T> {
    if (!this.tracer) {
      throw new Error("OpenTelemetry not initialized. Call otel.init() first.");
    }

    return this.tracer.startActiveSpan(
      name,
      { attributes },
      async (span: Span) => {
        try {
          const result = await fn(span);
          span.setStatus({ code: 1 }); // OK
          return result;
        } catch (error) {
          span.recordException(error as Error);
          span.setStatus({ code: 2, message: (error as Error).message }); // ERROR
          throw error;
        } finally {
          span.end();
        }
      },
    );
  }

  /**
   * Get the tracer instance for manual instrumentation
   */
  getTracer(): Tracer {
    if (!this.tracer) {
      throw new Error("OpenTelemetry not initialized. Call otel.init() first.");
    }
    return this.tracer;
  }

  /**
   * Get the meter instance for custom metrics
   */
  getMeter(): Meter {
    if (!this.meter) {
      throw new Error("OpenTelemetry not initialized. Call otel.init() first.");
    }
    return this.meter;
  }

  /**
   * Shutdown OpenTelemetry gracefully
   */
  async shutdown(): Promise<void> {
    if (this.sdk) {
      await this.sdk.shutdown();
      console.log("OpenTelemetry shutdown complete");
    }
  }
}

// Create singleton instance
const otel = new RecoverySkyTelemetry();

// Auto-initialize if not in test environment
if (
  process.env.NODE_ENV !== "test" &&
  process.env.OTEL_SDK_DISABLED !== "true"
) {
  otel.init();
}

// Export singleton and class for advanced usage
export default otel;
export { RecoverySkyTelemetry };

// NOTE: Signal handlers (SIGTERM/SIGINT) are not unit-tested because they require
// actually sending process signals and testing process.exit() behavior.
// These are best tested in integration/e2e tests or manually verified during deployment.
// Graceful shutdown functionality is unit-tested via the shutdown() method itself.
process.on("SIGTERM", async () => {
  await otel.shutdown();
  process.exit(0);
});

process.on("SIGINT", async () => {
  await otel.shutdown();
  process.exit(0);
});

/**
 * USAGE DOCUMENTATION
 *
 * 1. Basic Setup (server.ts):
 * ```typescript
 * // MUST BE FIRST IMPORT!
 * import './otel';
 *
 * import express from 'express';
 * import RecoverySkyLogger from './logger';
 *
 * const app = express();
 * const logger = new RecoverySkyLogger({ logName: 'api' });
 *
 * // Express is now auto-instrumented with tracing
 * app.get('/users', (req, res) => {
 *   logger.info({ userId: req.params.id }, 'Getting user');  // Includes traceId!
 *   res.json({ user: 'data' });
 * });
 * ```
 *
 * 2. Custom Business Logic Spans:
 * ```typescript
 * import otel from './otel';
 *
 * async function processPayment(userId: number, amount: number) {
 *   return await otel.withSpan('process-payment',
 *     { userId, amount, service: 'payment' },
 *     async (span) => {
 *       // Business logic here
 *       const result = await stripeAPI.charge({ amount });
 *       span.setAttributes({ paymentId: result.id });
 *       return result;
 *     }
 *   );
 * }
 * ```
 *
 * 3. Custom Metrics:
 * ```typescript
 * import otel from './otel';
 * const meter = otel.getMeter();
 *
 * const requestDuration = meter.createHistogram('http_request_duration_ms');
 * const errorCounter = meter.createCounter('errors_total');
 *
 * app.use((req, res, next) => {
 *   const start = Date.now();
 *   res.on('finish', () => {
 *     requestDuration.record(Date.now() - start, {
 *       method: req.method,
 *       route: req.route?.path || req.path,
 *       status: res.statusCode
 *     });
 *   });
 *   next();
 * });
 * ```
 *
 * 4. Environment Configuration:
 *
 * Development (Console output):
 * OTEL_TRACE_EXPORTER=console
 * OTEL_METRIC_EXPORTER=prometheus
 *
 * Production (Grafana Stack):
 * OTEL_TRACE_EXPORTER=otlp
 * OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://tempo:4318/v1/traces
 * OTEL_METRIC_EXPORTER=prometheus
 *
 * 5. Microservice Setup:
 * Each service needs:
 * - Unique OTEL_SERVICE_NAME (api, auth, payment, etc.)
 * - Same trace/metric endpoints
 * - Same otel.ts configuration
 *
 * 6. Integration with Logger:
 * The logger automatically includes trace context when:
 * - OTEL_TRACE_CORRELATION=true
 * - OpenTelemetry SDK is running
 * - There's an active span (request in progress)
 *
 * Result: All logs include traceId, spanId for correlation in Grafana!
 */

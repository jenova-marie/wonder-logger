/**
 * OpenTelemetry Factory
 *
 * Main entry point for creating and configuring OpenTelemetry instrumentation.
 */

import { NodeSDK } from '@opentelemetry/sdk-node'
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base'
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics'
import { createResource } from './utils/resource'
import { createConsoleTraceExporter } from './exporters/tracing/console'
import { createOtlpTraceExporter } from './exporters/tracing/otlp'
import { createJaegerTraceExporter } from './exporters/tracing/jaeger'
import { createPrometheusExporter } from './exporters/metrics/prometheus'
import { createOtlpMetricsExporter } from './exporters/metrics/otlp'
import { createAutoInstrumentations } from './instrumentations/auto'
import { setupGracefulShutdown } from './utils/gracefulShutdown'
import type { TelemetryOptions, TelemetrySDK } from './types'

/**
 * Creates and initializes OpenTelemetry instrumentation
 *
 * Builds a fully configured NodeSDK instance with:
 * - Service resource metadata
 * - Trace exporter (console, OTLP, or Jaeger)
 * - Metrics exporters (Prometheus and/or OTLP)
 * - Auto-instrumentation for Node.js libraries
 * - Graceful shutdown handlers
 *
 * @param options - Telemetry configuration options
 * @returns Initialized NodeSDK instance
 *
 * @example
 * ```typescript
 * // Basic usage with console exporter
 * const sdk = createTelemetry({
 *   serviceName: 'my-api',
 *   serviceVersion: '1.0.0'
 * })
 *
 * // Production with OTLP exporters
 * const sdk = createTelemetry({
 *   serviceName: 'my-api',
 *   serviceVersion: '1.0.0',
 *   environment: 'production',
 *   tracing: {
 *     exporter: 'otlp'
 *   },
 *   metrics: {
 *     exporters: ['prometheus', 'otlp'],
 *     port: 9090
 *   }
 * })
 * ```
 */
export function createTelemetry(options: TelemetryOptions): TelemetrySDK {
  // Build resource with service metadata
  const resource = createResource({
    serviceName: options.serviceName,
    serviceVersion: options.serviceVersion,
    environment: options.environment,
  })

  // Build trace processor
  let traceExporter
  const tracingOptions = options.tracing || {}

  if (tracingOptions.enabled !== false) {
    switch (tracingOptions.exporter || 'console') {
      case 'otlp':
        traceExporter = createOtlpTraceExporter()
        break
      case 'jaeger':
        traceExporter = createJaegerTraceExporter()
        break
      default:
        traceExporter = createConsoleTraceExporter()
    }
  }

  // Build metrics readers
  const metricReaders: any[] = []
  const metricsOptions = options.metrics || {}

  if (metricsOptions.enabled !== false) {
    const exporters = metricsOptions.exporters || ['prometheus']

    exporters.forEach((type) => {
      if (type === 'prometheus') {
        // PrometheusExporter is a MetricReader itself, not a PushMetricExporter
        metricReaders.push(createPrometheusExporter(metricsOptions.port))
      } else if (type === 'otlp') {
        metricReaders.push(
          new PeriodicExportingMetricReader({
            exporter: createOtlpMetricsExporter(),
            exportIntervalMillis: metricsOptions.exportIntervalMillis || 60000,
          })
        )
      }
    })
  }

  // Create and configure SDK
  const sdk = new NodeSDK({
    resource,
    spanProcessor: traceExporter ? new BatchSpanProcessor(traceExporter) : undefined,
    metricReader: metricReaders.length > 0 ? metricReaders[0] : undefined,
    instrumentations: createAutoInstrumentations({ includeHttpHooks: true }),
  })

  // Initialize SDK and setup graceful shutdown
  sdk.start()
  setupGracefulShutdown(sdk)

  // Return SDK with additional helper methods for testing
  return {
    /**
     * Start the SDK (already called in createTelemetry, provided for compatibility)
     */
    start: () => sdk.start(),

    /**
     * Shutdown the SDK and flush all pending telemetry
     */
    shutdown: () => sdk.shutdown(),

    /**
     * Force flush all pending telemetry data (useful for testing)
     * @returns Promise that resolves when flush is complete
     */
    forceFlush: async (): Promise<void> => {
      // NodeSDK doesn't expose forceFlush directly, but we can access the meter provider
      const meterProvider = (sdk as any)._meterProvider
      if (meterProvider && typeof meterProvider.forceFlush === 'function') {
        await meterProvider.forceFlush()
      }
    },
  }
}

// Re-export utilities and types
export { withSpan } from './utils/withSpan'
export type { TelemetryOptions, TracingOptions, MetricsOptions, TelemetrySDK } from './types'

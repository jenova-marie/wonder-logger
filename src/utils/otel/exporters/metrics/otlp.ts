/**
 * OTLP metrics exporter
 *
 * Exports metrics to an OTLP-compatible backend.
 */

import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http'

/**
 * Creates an OTLP metrics exporter
 *
 * Configures the exporter using environment variables:
 * - OTEL_EXPORTER_OTLP_METRICS_ENDPOINT: OTLP endpoint URL (default: http://localhost:4318/v1/metrics)
 *
 * @returns OTLPMetricExporter instance
 *
 * @example
 * ```typescript
 * // With environment variable:
 * // OTEL_EXPORTER_OTLP_METRICS_ENDPOINT=https://otlp.mycompany.com/v1/metrics
 *
 * const exporter = createOtlpMetricsExporter()
 * const reader = new PeriodicExportingMetricReader({ exporter })
 * ```
 */
export function createOtlpMetricsExporter(): OTLPMetricExporter {
  const endpoint = process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT || 'http://localhost:4318/v1/metrics'

  return new OTLPMetricExporter({ url: endpoint })
}

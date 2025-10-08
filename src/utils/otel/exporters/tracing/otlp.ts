/**
 * OTLP trace exporter
 *
 * Exports traces to an OTLP-compatible backend (e.g., Jaeger, Grafana Tempo, Honeycomb).
 */

import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'

/**
 * Creates an OTLP trace exporter
 *
 * Configures the exporter using environment variables:
 * - OTEL_EXPORTER_OTLP_ENDPOINT: OTLP endpoint URL (default: http://localhost:4318/v1/traces)
 * - OTEL_EXPORTER_OTLP_HEADERS: JSON string of headers to include (optional)
 *
 * @returns OTLPTraceExporter instance
 *
 * @example
 * ```typescript
 * // With environment variables:
 * // OTEL_EXPORTER_OTLP_ENDPOINT=https://api.honeycomb.io
 * // OTEL_EXPORTER_OTLP_HEADERS={"x-honeycomb-team":"your-api-key"}
 *
 * const exporter = createOtlpTraceExporter()
 * const processor = new BatchSpanProcessor(exporter)
 * ```
 */
export function createOtlpTraceExporter(): OTLPTraceExporter {
  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces'
  let headers: Record<string, string> = {}

  if (process.env.OTEL_EXPORTER_OTLP_HEADERS) {
    try {
      headers = JSON.parse(process.env.OTEL_EXPORTER_OTLP_HEADERS)
    } catch (error) {
      console.warn('Invalid OTEL_EXPORTER_OTLP_HEADERS JSON:', process.env.OTEL_EXPORTER_OTLP_HEADERS)
    }
  }

  return new OTLPTraceExporter({ url: endpoint, headers })
}

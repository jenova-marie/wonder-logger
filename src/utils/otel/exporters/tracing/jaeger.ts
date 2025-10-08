/**
 * Jaeger trace exporter
 *
 * Exports traces to a Jaeger backend.
 */

import { JaegerExporter } from '@opentelemetry/exporter-jaeger'

/**
 * Creates a Jaeger trace exporter
 *
 * Configures the exporter using environment variables:
 * - JAEGER_ENDPOINT: Jaeger endpoint URL (default: http://localhost:14268/api/traces)
 *
 * @returns JaegerExporter instance
 *
 * @example
 * ```typescript
 * // With environment variable:
 * // JAEGER_ENDPOINT=http://jaeger.mycompany.com:14268/api/traces
 *
 * const exporter = createJaegerTraceExporter()
 * const processor = new BatchSpanProcessor(exporter)
 * ```
 */
export function createJaegerTraceExporter(): JaegerExporter {
  return new JaegerExporter({
    endpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces',
  })
}

/**
 * Prometheus metrics exporter
 *
 * Exports metrics in Prometheus format via an HTTP endpoint.
 */

import { PrometheusExporter } from '@opentelemetry/exporter-prometheus'

/**
 * Creates a Prometheus metrics exporter
 *
 * Starts an HTTP server that exposes metrics at /metrics endpoint.
 * The exporter automatically registers with the OpenTelemetry metrics SDK.
 *
 * @param port - Port for metrics endpoint (default: 9464)
 * @returns PrometheusExporter instance
 *
 * @example
 * ```typescript
 * const exporter = createPrometheusExporter(9090)
 * // Metrics available at http://localhost:9090/metrics
 * ```
 */
export function createPrometheusExporter(port: number = 9464): PrometheusExporter {
  return new PrometheusExporter({ port }, () => {
    console.log(`📊 Prometheus metrics available at http://localhost:${port}/metrics`)
  })
}

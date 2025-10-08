/**
 * Console trace exporter
 *
 * Exports traces to console output for development and debugging.
 */

import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-base'

/**
 * Creates a console trace exporter
 *
 * Outputs trace spans to console in a human-readable format.
 * Useful for local development and debugging.
 *
 * @returns ConsoleSpanExporter instance
 *
 * @example
 * ```typescript
 * const exporter = createConsoleTraceExporter()
 * const processor = new BatchSpanProcessor(exporter)
 * ```
 */
export function createConsoleTraceExporter(): ConsoleSpanExporter {
  return new ConsoleSpanExporter()
}

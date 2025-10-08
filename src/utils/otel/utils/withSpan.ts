/**
 * Span utility for manual instrumentation
 *
 * Provides a helper function to wrap async operations in OpenTelemetry spans.
 */

import { trace, context, SpanStatusCode } from '@opentelemetry/api'

/**
 * Wraps an async function with an OpenTelemetry span
 *
 * Creates a new span, executes the provided function within the span context,
 * and automatically handles span lifecycle (status, exceptions, ending).
 *
 * @param name - Name of the span
 * @param fn - Async function to wrap with span
 * @param tracerName - Name of the tracer (default: 'default')
 * @returns Promise resolving to the function result
 *
 * @example
 * ```typescript
 * const result = await withSpan('database-query', async () => {
 *   return await db.query('SELECT * FROM users')
 * })
 *
 * // With custom tracer name
 * const result = await withSpan(
 *   'api-call',
 *   async () => fetch('https://api.example.com'),
 *   'my-service'
 * )
 * ```
 */
export async function withSpan<T>(
  name: string,
  fn: () => Promise<T>,
  tracerName: string = 'default'
): Promise<T> {
  const tracer = trace.getTracer(tracerName)
  const span = tracer.startSpan(name)

  return context.with(trace.setSpan(context.active(), span), async () => {
    try {
      const result = await fn()
      span.setStatus({ code: SpanStatusCode.OK })
      return result
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : String(error),
      })
      span.recordException(error as Error)
      throw error
    } finally {
      span.end()
    }
  })
}

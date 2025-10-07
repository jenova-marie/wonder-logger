/**
 * OpenTelemetry Trace Context Plugin for Pino Logger
 *
 * Wraps a logger to automatically inject trace context (traceId, spanId) into all log entries.
 *
 * @example
 * import { createLogger } from '../logger'
 * import { withTraceContext } from './plugins/traceContext'
 *
 * const baseLogger = createLogger({ name: 'api' })
 * const logger = withTraceContext(baseLogger)
 *
 * logger.info({ userId: 123 }, 'User action')
 * // Logs will include traceId and spanId if an active span exists
 *
 * @requires @opentelemetry/api
 */

import type pino from 'pino'

interface TraceContext {
  traceId?: string
  spanId?: string
  traceFlags?: string
}

// Lazy load OpenTelemetry API
let otelTrace: any = null

/**
 * Loads OpenTelemetry trace API
 * @throws Error if @opentelemetry/api is not installed
 *
 * NOTE: The error throw path (lines 45-49) is not unit-tested because @opentelemetry/api
 * is installed in this project. Testing the missing dependency scenario would require
 * complex module mocking or integration tests in an environment without the package.
 */
function loadOtelApi(): any {
  if (otelTrace !== null) {
    return otelTrace
  }

  try {
    // Synchronous import - will throw if not installed
    const otel = require('@opentelemetry/api')
    otelTrace = otel.trace
    return otelTrace
  } catch (error) {
    throw new Error(
      'Cannot enable trace context: @opentelemetry/api is not installed. ' +
        'Install it with: pnpm add @opentelemetry/api'
    )
  }
}

/**
 * Extracts current trace context from active OpenTelemetry span
 *
 * @returns Trace context object with traceId, spanId, and traceFlags
 *
 * NOTE: Lines 59-60, 66-72, 75 are not fully unit-tested because they require
 * active OpenTelemetry spans with trace context, which only exist during actual
 * instrumented HTTP requests or within otel.withSpan() blocks. These code paths
 * are covered by integration tests where real OTEL spans are active.
 */
function getTraceContext(): TraceContext {
  if (!otelTrace) {
    return {}
  }

  try {
    const currentSpan = otelTrace.getActiveSpan()

    if (currentSpan) {
      const { traceId, spanId, traceFlags } = currentSpan.spanContext()
      return {
        traceId,
        spanId,
        traceFlags: traceFlags.toString(),
      }
    }
  } catch (error) {
    // Silently fail if unable to get trace context
  }

  return {}
}

/**
 * Merges trace context into log object
 *
 * @param obj - Log object (or string message)
 * @returns Object with trace context merged in
 */
function mergeTraceContext(obj: any): any {
  // If obj is a string, return it unchanged
  if (typeof obj !== 'object' || obj === null) {
    return obj
  }

  // Merge trace context
  return {
    ...obj,
    ...getTraceContext(),
  }
}

/**
 * Wraps a Pino logger to automatically inject OpenTelemetry trace context
 *
 * All log methods (trace, debug, info, warn, error, fatal) will include
 * traceId, spanId, and traceFlags from the active OTEL span.
 *
 * @param logger - Base Pino logger instance
 * @returns Wrapped logger with trace context injection
 * @throws Error if @opentelemetry/api is not installed
 *
 * @example
 * const logger = withTraceContext(createLogger({ name: 'api' }))
 * logger.info({ userId: 123 }, 'User logged in')
 * // Output includes: { traceId: '...', spanId: '...', userId: 123, msg: 'User logged in' }
 */
export function withTraceContext(logger: pino.Logger): pino.Logger {
  // Load OTEL API synchronously (throws if not available)
  loadOtelApi()

  // Create a proxy that wraps all log methods
  return new Proxy(logger, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver)

      // Wrap logging methods
      if (
        typeof prop === 'string' &&
        ['trace', 'debug', 'info', 'warn', 'error', 'fatal'].includes(prop)
      ) {
        return function (obj: any, msg?: string, ...args: any[]) {
          // Inject trace context if obj is an object
          const enhancedObj = mergeTraceContext(obj)
          return value.call(target, enhancedObj, msg, ...args)
        }
      }

      // Pass through all other properties/methods unchanged
      return value
    },
  }) as pino.Logger
}

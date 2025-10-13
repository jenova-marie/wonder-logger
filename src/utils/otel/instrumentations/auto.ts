/**
 * Auto-instrumentation configuration
 *
 * Provides automatic instrumentation for common Node.js libraries and frameworks.
 */

import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http'
import { createHttpRequestHook, createHttpResponseHook } from './httpHooks.js'
import type { AutoInstrumentationOptions } from '../types.js'

/**
 * Creates auto-instrumentation configuration
 *
 * Automatically instruments popular Node.js libraries including:
 * - HTTP/HTTPS
 * - Express
 * - GraphQL
 * - MongoDB
 * - PostgreSQL
 * - And many more...
 *
 * File system instrumentation is disabled by default for performance.
 *
 * @param options - Auto-instrumentation options
 * @returns Array of instrumentation instances
 *
 * @example
 * ```typescript
 * // Without HTTP hooks
 * const instrumentations = createAutoInstrumentations()
 *
 * // With HTTP hooks for additional request/response attributes
 * const instrumentations = createAutoInstrumentations({
 *   includeHttpHooks: true
 * })
 * ```
 */
export function createAutoInstrumentations(options: AutoInstrumentationOptions = {}): any[] {
  const { includeHttpHooks = false } = options

  const baseInstrumentations = getNodeAutoInstrumentations({
    '@opentelemetry/instrumentation-fs': {
      enabled: false,
    },
  })

  if (includeHttpHooks) {
    return [
      ...baseInstrumentations,
      new HttpInstrumentation({
        requestHook: createHttpRequestHook(),
        responseHook: createHttpResponseHook(),
      }),
    ]
  }

  return baseInstrumentations
}

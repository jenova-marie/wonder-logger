/**
 * Modular Pino Logger Factory
 *
 * Clean, composable logger with pluggable transports.
 *
 * @example Simple usage
 * import { createLogger } from './logger'
 *
 * const logger = createLogger({
 *   name: 'api',
 *   level: 'info'
 * })
 *
 * logger.info({ userId: 123 }, 'User logged in')
 *
 * @example Custom transports
 * import { createLogger } from './logger'
 * import { createConsoleTransport } from './logger/transports/console'
 * import { createFileTransport } from './logger/transports/file'
 *
 * const logger = createLogger({
 *   name: 'api',
 *   level: 'info',
 *   transports: [
 *     createConsoleTransport({ pretty: true }),
 *     createFileTransport({ dir: './logs', fileName: 'api.log' })
 *   ]
 * })
 *
 * @example With plugins
 * import { createLogger } from './logger'
 * import { withTraceContext } from './logger/plugins/traceContext'
 *
 * const baseLogger = createLogger({ name: 'api' })
 * const logger = withTraceContext(baseLogger)
 *
 * @requires pino
 */

import pino from 'pino'

export interface LoggerOptions {
  /**
   * Logger name / service name
   * @required
   */
  name: string

  /**
   * Minimum log level
   * @default 'info'
   */
  level?: pino.LevelWithSilent

  /**
   * Custom transports (pino stream entries)
   * If not provided, defaults to console transport
   */
  transports?: pino.StreamEntry[]

  /**
   * Additional base fields to include in every log
   */
  base?: Record<string, any>

  /**
   * Pino serializers for custom object types
   */
  serializers?: Record<string, pino.SerializerFn>
}

/**
 * Creates a Pino logger instance with configured transports
 *
 * @param options - Logger configuration
 * @returns Configured Pino logger
 *
 * @example
 * const logger = createLogger({
 *   name: 'my-service',
 *   level: 'debug'
 * })
 */
export function createLogger(options: LoggerOptions): pino.Logger {
  const {
    name,
    level = 'info',
    transports,
    base = {},
    serializers,
  } = options

  // Default to console transport if none provided
  const streams = transports ?? [
    {
      level,
      stream: process.stdout,
    },
  ]

  return pino(
    {
      name,
      level,
      base: {
        service: name,
        ...base,
      },
      serializers,
    },
    streams.length > 1 ? pino.multistream(streams) : streams[0].stream
  )
}

// Re-export transport builders for convenience
export { createConsoleTransport } from './transports/console'
export { createFileTransport } from './transports/file'
export { createOtelTransport } from './transports/otel'
export { createMemoryTransport } from './transports/memory'

// Re-export memory transport utilities
export {
  getMemoryLogs,
  clearMemoryLogs,
  getMemoryLogSize,
  getAllMemoryStoreNames,
} from './transports/memory'

// Re-export plugin utilities
export { withTraceContext } from './plugins/traceContext'
export { createMorganStream } from './plugins/morganStream'

// Re-export types
export type { ConsoleTransportOptions } from './transports/console'
export type { FileTransportOptions } from './transports/file'
export type { OtelTransportOptions } from './transports/otel'
export type {
  MemoryTransportOptions,
  MemoryQueryOptions,
  RawLogEntry,
  ParsedLogEntry,
} from './transports/memory'

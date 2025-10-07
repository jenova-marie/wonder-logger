/**
 * Console Transport for Pino Logger
 *
 * Provides console output with optional pretty printing for development.
 *
 * @example
 * import { createConsoleTransport } from './transports/console'
 *
 * const transport = createConsoleTransport({ pretty: true })
 *
 * @requires pino
 * @requires pino-pretty (when pretty is true)
 */

import pino from 'pino'

export interface ConsoleTransportOptions {
  /**
   * Enable pretty printing (colorized, human-readable output)
   * Typically true for development, false for production
   */
  pretty?: boolean

  /**
   * Log level for this transport
   * @default 'info'
   */
  level?: pino.Level

  /**
   * Custom pino-pretty options (only used when pretty is true)
   */
  prettyOptions?: {
    colorize?: boolean
    translateTime?: string
    ignore?: string
    singleLine?: boolean
    [key: string]: any
  }
}

/**
 * Creates a console transport configuration for pino
 *
 * @param options - Console transport configuration
 * @returns Pino stream transport configuration
 */
export function createConsoleTransport(
  options: ConsoleTransportOptions = {}
): pino.StreamEntry {
  const {
    pretty = false,
    level = 'info',
    prettyOptions = {},
  } = options

  // Pretty printed console (development)
  if (pretty) {
    return {
      level,
      stream: pino.transport({
        target: 'pino-pretty',
        options: {
          colorize: prettyOptions.colorize ?? true,
          translateTime: prettyOptions.translateTime ?? 'yyyy-mm-dd HH:MM:ss',
          ignore: prettyOptions.ignore ?? 'pid,hostname',
          ...prettyOptions,
        },
      }),
    }
  }

  // JSON console output (production)
  return {
    level,
    stream: process.stdout,
  }
}

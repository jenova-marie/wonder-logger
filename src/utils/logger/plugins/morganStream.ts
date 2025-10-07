/**
 * Morgan HTTP Logger Stream Adapter
 *
 * Creates a Morgan-compatible write stream that logs HTTP requests through Pino.
 *
 * @example
 * import express from 'express'
 * import morgan from 'morgan'
 * import { createLogger } from '../logger'
 * import { createMorganStream } from './plugins/morganStream'
 *
 * const logger = createLogger({ name: 'http' })
 * const stream = createMorganStream(logger)
 *
 * app.use(morgan('combined', { stream }))
 *
 * @requires pino
 */

import type pino from 'pino'

export interface MorganStream {
  write: (message: string) => void
}

/**
 * Creates a Morgan-compatible stream that writes to a Pino logger
 *
 * Morgan appends newlines to messages, which this stream automatically strips.
 *
 * @param logger - Pino logger instance
 * @param level - Log level to use for HTTP logs (default: 'info')
 * @returns Morgan-compatible stream object
 *
 * @example
 * const httpLogger = createLogger({ name: 'http' })
 * const stream = createMorganStream(httpLogger)
 * app.use(morgan('combined', { stream }))
 */
export function createMorganStream(
  logger: pino.Logger,
  level: 'trace' | 'debug' | 'info' | 'warn' | 'error' = 'info'
): MorganStream {
  return {
    write(message: string): void {
      // Morgan appends a newline - strip it
      const cleanMessage = message.replace(/\n$/, '')
      logger[level](cleanMessage)
    },
  }
}

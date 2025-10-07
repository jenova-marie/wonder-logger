/**
 * File Transport for Pino Logger
 *
 * Provides file-based logging with automatic directory creation.
 *
 * @example
 * import { createFileTransport } from './transports/file'
 *
 * const transport = createFileTransport({
 *   dir: './logs',
 *   fileName: 'app.log'
 * })
 *
 * @requires pino
 */

import pino from 'pino'
import path from 'path'
import fs from 'fs'

export interface FileTransportOptions {
  /**
   * Directory to write log files
   * @default './logs'
   */
  dir?: string

  /**
   * Log file name
   * @default 'app.log'
   */
  fileName?: string

  /**
   * Log level for this transport
   * @default 'info'
   */
  level?: pino.Level

  /**
   * Write synchronously (slower but ensures writes complete)
   * @default false
   */
  sync?: boolean

  /**
   * Create directory if it doesn't exist
   * @default true
   */
  mkdir?: boolean
}

/**
 * Ensures the log directory exists, creating it if necessary
 *
 * @param dir - Directory path
 * @throws Error if directory creation fails
 */
function ensureDirectory(dir: string): void {
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true })
    } catch (error) {
      throw new Error(
        `Failed to create log directory '${dir}': ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }
}

/**
 * Creates a file transport configuration for pino
 *
 * @param options - File transport configuration
 * @returns Pino stream transport configuration
 */
export function createFileTransport(
  options: FileTransportOptions = {}
): pino.StreamEntry {
  const {
    dir = './logs',
    fileName = 'app.log',
    level = 'info',
    sync = false,
    mkdir = true,
  } = options

  // Ensure directory exists
  if (mkdir) {
    ensureDirectory(dir)
  }

  const filePath = path.join(dir, fileName)

  return {
    level,
    stream: pino.destination({
      dest: filePath,
      sync,
      mkdir: true,
    }),
  }
}

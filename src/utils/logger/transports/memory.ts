/**
 * Memory Transport for Pino Logger
 *
 * Stores logs in memory with circular buffer and provides query API.
 * Useful for testing, debugging, and runtime log inspection.
 *
 * @example
 * import { createMemoryTransport, getMemoryLogs } from './transports/memory'
 *
 * // Setup
 * const transport = createMemoryTransport({ name: 'api', maxSize: 5000 })
 *
 * // Query anywhere
 * const logs = getMemoryLogs('api', { since: Date.now() - 60000 })
 *
 * @requires pino
 */

import pino from 'pino'
import { Writable } from 'stream'

/**
 * Raw log entry as stored in memory
 */
export interface RawLogEntry {
  level: number
  time: number
  service?: string
  msg: string
  [key: string]: any
}

/**
 * Parsed log entry with human-readable level
 */
export interface ParsedLogEntry {
  level: string
  timestamp: number
  message: string
  service?: string
  [key: string]: any
}

/**
 * Memory transport configuration
 */
export interface MemoryTransportOptions {
  /**
   * Registry name for querying logs
   * If not provided, defaults to logger name
   */
  name?: string

  /**
   * Maximum number of logs to store (circular buffer)
   * @default 10000
   */
  maxSize?: number

  /**
   * Log level for this transport
   * @default 'info'
   */
  level?: pino.Level
}

/**
 * Query options for retrieving logs
 */
export interface MemoryQueryOptions {
  /**
   * Get logs after this timestamp (milliseconds)
   */
  since?: number

  /**
   * Return format
   * - 'raw': Pino JSON objects as-is
   * - 'parsed': Human-readable format with string levels
   * @default 'raw'
   */
  format?: 'raw' | 'parsed'

  /**
   * Filter by log level(s)
   * Single level: 'error'
   * Multiple levels: ['error', 'warn']
   */
  level?: pino.LevelWithSilent | pino.LevelWithSilent[]
}

/**
 * Internal storage for log entries
 */
interface MemoryStore {
  logs: RawLogEntry[]
  maxSize: number
}

/**
 * Module-level registry of memory stores
 */
const memoryStores = new Map<string, MemoryStore>()

/**
 * Pino level number to string mapping
 */
const LEVEL_MAP: Record<number, string> = {
  10: 'trace',
  20: 'debug',
  30: 'info',
  40: 'warn',
  50: 'error',
  60: 'fatal',
}

/**
 * String level to number mapping
 */
const LEVEL_NUMBER_MAP: Record<string, number> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
}

/**
 * Creates a memory transport configuration for pino
 *
 * @param options - Memory transport configuration
 * @returns Pino stream transport configuration
 */
export function createMemoryTransport(
  options: MemoryTransportOptions = {}
): pino.StreamEntry {
  const { name, maxSize = 10000, level = 'info' } = options

  // Determine registry key
  const storeName = name || 'default'

  // Initialize store if it doesn't exist
  if (!memoryStores.has(storeName)) {
    memoryStores.set(storeName, {
      logs: [],
      maxSize,
    })
  }

  const store = memoryStores.get(storeName)!

  // Create writable stream that captures logs
  const stream = new Writable({
    write(chunk: Buffer, _encoding: string, callback: () => void) {
      try {
        const log = JSON.parse(chunk.toString()) as RawLogEntry

        // Add to circular buffer
        store.logs.push(log)

        // Maintain max size (remove oldest if over limit)
        if (store.logs.length > store.maxSize) {
          store.logs.shift()
        }

        callback()
      } catch (err) {
        // Skip malformed logs
        callback()
      }
    },
  })

  return {
    level,
    stream,
  }
}

/**
 * Query logs from memory store
 *
 * @param name - Registry name of the memory store
 * @param options - Query options (since, format, level)
 * @returns Array of log entries (raw or parsed)
 *
 * @example
 * // Get all logs
 * getMemoryLogs('api')
 *
 * @example
 * // Get logs from last minute
 * getMemoryLogs('api', { since: Date.now() - 60000 })
 *
 * @example
 * // Get only errors, parsed format
 * getMemoryLogs('api', { level: 'error', format: 'parsed' })
 *
 * @example
 * // Get errors and warnings from last 5 minutes
 * getMemoryLogs('api', {
 *   since: Date.now() - 300000,
 *   level: ['error', 'warn']
 * })
 */
export function getMemoryLogs(
  name: string,
  options: MemoryQueryOptions = {}
): RawLogEntry[] | ParsedLogEntry[] {
  const { since, format = 'raw', level } = options

  const store = memoryStores.get(name)
  if (!store) {
    return []
  }

  let logs = store.logs

  // Filter by timestamp
  if (since !== undefined) {
    logs = logs.filter((log) => log.time >= since)
  }

  // Filter by level(s)
  if (level !== undefined) {
    const levels = Array.isArray(level) ? level : [level]
    const levelNumbers = levels.map((l) => LEVEL_NUMBER_MAP[l])
    logs = logs.filter((log) => levelNumbers.includes(log.level))
  }

  // Return raw or parsed format
  if (format === 'parsed') {
    return logs.map((log) => ({
      level: LEVEL_MAP[log.level] || 'unknown',
      timestamp: log.time,
      message: log.msg,
      service: log.service,
      ...Object.fromEntries(
        Object.entries(log).filter(
          ([key]) => !['level', 'time', 'msg', 'service'].includes(key)
        )
      ),
    }))
  }

  return logs
}

/**
 * Clear all logs from a memory store
 *
 * @param name - Registry name of the memory store
 */
export function clearMemoryLogs(name: string): void {
  const store = memoryStores.get(name)
  if (store) {
    store.logs = []
  }
}

/**
 * Get current number of logs in a memory store
 *
 * @param name - Registry name of the memory store
 * @returns Number of logs currently stored
 */
export function getMemoryLogSize(name: string): number {
  const store = memoryStores.get(name)
  return store ? store.logs.length : 0
}

/**
 * Get all registered memory store names
 *
 * @returns Array of registry names
 */
export function getAllMemoryStoreNames(): string[] {
  return Array.from(memoryStores.keys())
}

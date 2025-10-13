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
import { Subject, Observable, EMPTY, filter, throttleTime, bufferTime } from 'rxjs'
import type { OperatorFunction, MonoTypeOperatorFunction } from 'rxjs'

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
  subject: Subject<RawLogEntry>
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
      subject: new Subject<RawLogEntry>(),
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

        // Emit to RxJS subscribers
        store.subject.next(log)

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
 * Get real-time log stream as an RxJS Observable
 *
 * Returns only live logs (no replay buffer). Use RxJS operators to filter,
 * throttle, buffer, or otherwise transform the stream.
 *
 * @param name - Registry name of the memory store
 * @returns Observable that emits log entries in real-time
 *
 * @example
 * // Subscribe to all logs
 * const logs$ = getMemoryLogStream('api')
 * logs$.subscribe(log => console.log(log))
 *
 * @example
 * // Filter by level using helper operator
 * import { filterByLevel } from './transports/memory'
 * logs$.pipe(
 *   filterByLevel('error')
 * ).subscribe(log => console.error(log))
 *
 * @example
 * // Built-in backpressure with throttling
 * import { withBackpressure } from './transports/memory'
 * logs$.pipe(
 *   withBackpressure({ throttleMs: 1000 })
 * ).subscribe(log => sendToSlack(log))
 */
export function getMemoryLogStream(name: string): Observable<RawLogEntry> {
  const store = memoryStores.get(name)
  if (!store) {
    return EMPTY
  }

  return store.subject.asObservable()
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

/**
 * RxJS operator to filter log stream by level(s)
 *
 * @param level - Single level or array of levels to include
 * @returns Operator function that filters logs
 *
 * @example
 * // Filter for errors only
 * logs$.pipe(filterByLevel('error')).subscribe(...)
 *
 * @example
 * // Filter for errors and warnings
 * logs$.pipe(filterByLevel(['error', 'warn'])).subscribe(...)
 */
export function filterByLevel(
  level: pino.LevelWithSilent | pino.LevelWithSilent[]
): MonoTypeOperatorFunction<RawLogEntry> {
  const levels = Array.isArray(level) ? level : [level]
  const levelNumbers = levels.map((l) => LEVEL_NUMBER_MAP[l])

  return filter((log: RawLogEntry) => levelNumbers.includes(log.level))
}

/**
 * RxJS operator to filter log stream by timestamp
 *
 * @param timestamp - Minimum timestamp (milliseconds)
 * @returns Operator function that filters logs after timestamp
 *
 * @example
 * // Only logs from last minute
 * logs$.pipe(filterSince(Date.now() - 60000)).subscribe(...)
 */
export function filterSince(
  timestamp: number
): MonoTypeOperatorFunction<RawLogEntry> {
  return filter((log: RawLogEntry) => log.time >= timestamp)
}

/**
 * Backpressure configuration for log streams
 */
export interface BackpressureOptions {
  /**
   * Throttle mode: emit one log every N milliseconds
   */
  throttleMs?: number

  /**
   * Buffer mode: collect logs for N milliseconds then emit array
   */
  bufferMs?: number
}

/**
 * RxJS operator to apply backpressure handling
 *
 * Prevents overwhelming subscribers by throttling or buffering log emissions.
 * Choose either throttle (emit one log per interval) or buffer (emit arrays).
 *
 * @param options - Backpressure configuration
 * @returns Operator function that applies backpressure
 *
 * @example
 * // Throttle: emit max one log per second
 * logs$.pipe(
 *   withBackpressure({ throttleMs: 1000 })
 * ).subscribe(log => sendToSlack(log))
 *
 * @example
 * // Buffer: emit batches every 5 seconds
 * logs$.pipe(
 *   withBackpressure({ bufferMs: 5000 })
 * ).subscribe(logs => bulkInsertToDb(logs))
 */
export function withBackpressure(
  options: BackpressureOptions
): OperatorFunction<RawLogEntry, RawLogEntry | RawLogEntry[]> {
  if (options.throttleMs !== undefined) {
    return throttleTime(options.throttleMs) as OperatorFunction<
      RawLogEntry,
      RawLogEntry | RawLogEntry[]
    >
  }

  if (options.bufferMs !== undefined) {
    return bufferTime(options.bufferMs) as OperatorFunction<
      RawLogEntry,
      RawLogEntry | RawLogEntry[]
    >
  }

  // No backpressure - pass through
  return (source) => source as Observable<RawLogEntry | RawLogEntry[]>
}

/**
 * Dispose of a memory store and complete its RxJS subject
 *
 * Completes the subject (stopping all emissions), clears logs, and removes
 * the store from the registry. All subscribers will automatically complete.
 *
 * @param name - Registry name of the memory store
 *
 * @example
 * // Cleanup when shutting down
 * disposeMemoryStore('api')
 */
export function disposeMemoryStore(name: string): void {
  const store = memoryStores.get(name)
  if (store) {
    store.subject.complete()
    store.logs = []
    memoryStores.delete(name)
  }
}

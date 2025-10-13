/**
 * Integration tests for memory transport
 *
 * These tests verify real memory transport behavior in production scenarios
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  createLogger,
  createMemoryTransport,
  getMemoryLogs,
  clearMemoryLogs,
  getMemoryLogSize,
  getAllMemoryStoreNames,
} from '../../../src/utils/logger'

describe('Logger Integration - Memory Transport', () => {
  beforeEach(() => {
    // Clean up all memory stores
    getAllMemoryStoreNames().forEach((name) => clearMemoryLogs(name))
  })

  afterEach(() => {
    getAllMemoryStoreNames().forEach((name) => clearMemoryLogs(name))
  })

  describe('Real-world logging scenarios', () => {
    it('should capture logs for debugging and inspection', async () => {
      const logger = createLogger({
        name: 'debug-api',
        level: 'debug',
        transports: [
          createMemoryTransport({
            name: 'debug-logs',
            maxSize: 1000,
            level: 'debug',
          }),
        ],
      })

      // Simulate API request flow
      logger.debug({ endpoint: '/users' }, 'API request received')
      logger.info({ userId: 123 }, 'User authenticated')
      logger.debug({ query: 'SELECT * FROM users' }, 'Database query')
      logger.info({ count: 5 }, 'Users fetched')
      logger.debug({ responseTime: 45 }, 'Response sent')

      // Wait for async writes
      await new Promise((resolve) => setTimeout(resolve, 100))

      const logs = getMemoryLogs('debug-logs')
      expect(logs).toHaveLength(5)
      expect(logs[0].msg).toBe('API request received')
      expect(logs[4].msg).toBe('Response sent')
    })

    it('should enable error log inspection and analysis', async () => {
      const logger = createLogger({
        name: 'api',
        transports: [
          createMemoryTransport({
            name: 'error-tracking',
          }),
        ],
      })

      // Simulate error scenarios
      logger.info('Normal operation')
      logger.error({ code: 'DB_ERROR', table: 'users' }, 'Database connection failed')
      logger.error(
        { code: 'AUTH_ERROR', userId: 456 },
        'Authentication failed'
      )
      logger.info('Recovery attempted')

      await new Promise((resolve) => setTimeout(resolve, 100))

      // Query only errors using level filter
      const errorLogs = getMemoryLogs('error-tracking', {
        level: 'error',
        format: 'parsed',
      })
      expect(errorLogs).toHaveLength(2)
      expect(errorLogs[0]).toMatchObject({
        level: 'error',
        message: 'Database connection failed',
        code: 'DB_ERROR',
      })
      expect(errorLogs[1]).toMatchObject({
        level: 'error',
        message: 'Authentication failed',
        code: 'AUTH_ERROR',
      })
    })

    it('should support request-scoped logging with child loggers', async () => {
      const logger = createLogger({
        name: 'api',
        transports: [
          createMemoryTransport({
            name: 'request-logs',
          }),
        ],
      })

      // Simulate two concurrent requests
      const request1 = logger.child({ requestId: 'req-001', userId: 100 })
      const request2 = logger.child({ requestId: 'req-002', userId: 200 })

      request1.info('Processing payment')
      request2.info('Fetching profile')
      request1.info({ amount: 50 }, 'Payment completed')
      request2.info({ fields: ['name', 'email'] }, 'Profile fetched')

      await new Promise((resolve) => setTimeout(resolve, 100))

      const logs = getMemoryLogs('request-logs', { format: 'parsed' })
      expect(logs).toHaveLength(4)

      // Verify request isolation
      const req1Logs = logs.filter((log) => log.requestId === 'req-001')
      const req2Logs = logs.filter((log) => log.requestId === 'req-002')

      expect(req1Logs).toHaveLength(2)
      expect(req2Logs).toHaveLength(2)
      expect(req1Logs[0].userId).toBe(100)
      expect(req2Logs[0].userId).toBe(200)
    })

    it('should handle high-volume logging with circular buffer', async () => {
      const logger = createLogger({
        name: 'high-volume',
        transports: [
          createMemoryTransport({
            name: 'volume-test',
            maxSize: 100, // Small buffer
          }),
        ],
      })

      // Log 500 messages
      for (let i = 0; i < 500; i++) {
        logger.info({ iteration: i }, `Log message ${i}`)
      }

      await new Promise((resolve) => setTimeout(resolve, 200))

      const size = getMemoryLogSize('volume-test')
      expect(size).toBe(100) // Should maintain max size

      // Verify only latest logs are kept
      const logs = getMemoryLogs('volume-test')
      expect(logs[0]).toMatchObject({ iteration: 400 })
      expect(logs[99]).toMatchObject({ iteration: 499 })
    })
  })

  describe('Querying and filtering', () => {
    it('should query logs by time range', async () => {
      const logger = createLogger({
        name: 'api',
        transports: [createMemoryTransport({ name: 'time-query' })],
      })

      const startTime = Date.now()

      logger.info('Old log 1')
      logger.info('Old log 2')

      await new Promise((resolve) => setTimeout(resolve, 100))

      const queryTime = Date.now()

      logger.info('New log 1')
      logger.info('New log 2')

      await new Promise((resolve) => setTimeout(resolve, 100))

      const recentLogs = getMemoryLogs('time-query', {
        since: queryTime,
        format: 'parsed',
      })

      expect(recentLogs).toHaveLength(2)
      expect(recentLogs[0].message).toBe('New log 1')
      expect(recentLogs[1].message).toBe('New log 2')
    })

    it('should query logs by severity level', async () => {
      const logger = createLogger({
        name: 'api',
        level: 'trace',
        transports: [createMemoryTransport({ name: 'level-query', level: 'trace' })],
      })

      logger.trace('Trace log')
      logger.debug('Debug log')
      logger.info('Info log')
      logger.warn('Warning log')
      logger.error('Error log')

      await new Promise((resolve) => setTimeout(resolve, 100))

      // Query warnings and errors
      const criticalLogs = getMemoryLogs('level-query', {
        level: ['warn', 'error'],
        format: 'parsed',
      })

      expect(criticalLogs).toHaveLength(2)
      expect(criticalLogs[0].level).toBe('warn')
      expect(criticalLogs[1].level).toBe('error')
    })

    it('should combine time and level filters', async () => {
      const logger = createLogger({
        name: 'api',
        transports: [createMemoryTransport({ name: 'combined-query' })],
      })

      const queryTime = Date.now()

      logger.info('Old info')
      logger.error('Old error')

      await new Promise((resolve) => setTimeout(resolve, 100))

      logger.info('New info')
      logger.error('New error')

      await new Promise((resolve) => setTimeout(resolve, 100))

      const recentErrors = getMemoryLogs('combined-query', {
        since: queryTime + 50,
        level: 'error',
        format: 'parsed',
      })

      expect(recentErrors).toHaveLength(1)
      expect(recentErrors[0]).toMatchObject({
        level: 'error',
        message: 'New error',
      })
    })
  })

  describe('Multiple memory stores', () => {
    it('should support multiple independent memory stores', async () => {
      const apiLogger = createLogger({
        name: 'api',
        transports: [createMemoryTransport({ name: 'api-logs' })],
      })

      const workerLogger = createLogger({
        name: 'worker',
        transports: [createMemoryTransport({ name: 'worker-logs' })],
      })

      apiLogger.info('API log')
      workerLogger.info('Worker log')

      await new Promise((resolve) => setTimeout(resolve, 100))

      const apiLogs = getMemoryLogs('api-logs')
      const workerLogs = getMemoryLogs('worker-logs')

      expect(apiLogs).toHaveLength(1)
      expect(workerLogs).toHaveLength(1)
      expect(apiLogs[0].service).toBe('api')
      expect(workerLogs[0].service).toBe('worker')
    })

    it('should allow clearing specific stores without affecting others', async () => {
      const logger1 = createLogger({
        name: 'service1',
        transports: [createMemoryTransport({ name: 'store1' })],
      })

      const logger2 = createLogger({
        name: 'service2',
        transports: [createMemoryTransport({ name: 'store2' })],
      })

      logger1.info('Log 1')
      logger2.info('Log 2')

      await new Promise((resolve) => setTimeout(resolve, 100))

      clearMemoryLogs('store1')

      expect(getMemoryLogSize('store1')).toBe(0)
      expect(getMemoryLogSize('store2')).toBe(1)
    })
  })

  describe('Hybrid transport configurations', () => {
    it('should work alongside console transport', async () => {
      const logger = createLogger({
        name: 'hybrid',
        transports: [
          { level: 'info', stream: process.stdout }, // Console
          createMemoryTransport({ name: 'hybrid-memory' }), // Memory
        ],
      })

      logger.info({ test: true }, 'Hybrid log')

      await new Promise((resolve) => setTimeout(resolve, 100))

      const memoryLogs = getMemoryLogs('hybrid-memory')
      expect(memoryLogs).toHaveLength(1)
      expect(memoryLogs[0]).toMatchObject({
        msg: 'Hybrid log',
        test: true,
      })
    })

    it('should support different levels per transport', async () => {
      const logger = createLogger({
        name: 'multi-level',
        level: 'debug',
        transports: [
          createMemoryTransport({
            name: 'all-logs',
            level: 'debug',
          }),
          createMemoryTransport({
            name: 'errors-only',
            level: 'error',
          }),
        ],
      })

      logger.debug('Debug message')
      logger.info('Info message')
      logger.error('Error message')

      await new Promise((resolve) => setTimeout(resolve, 100))

      const allLogs = getMemoryLogs('all-logs')
      const errorLogs = getMemoryLogs('errors-only')

      expect(allLogs).toHaveLength(3)
      expect(errorLogs).toHaveLength(1)
      expect(errorLogs[0].msg).toBe('Error message')
    })
  })

  describe('Performance and edge cases', () => {
    it('should handle rapid sequential logging', async () => {
      const logger = createLogger({
        name: 'rapid',
        transports: [createMemoryTransport({ name: 'rapid-logs' })],
      })

      // Rapid fire 100 logs
      for (let i = 0; i < 100; i++) {
        logger.info({ index: i }, `Rapid log ${i}`)
      }

      await new Promise((resolve) => setTimeout(resolve, 200))

      const logs = getMemoryLogs('rapid-logs')
      expect(logs).toHaveLength(100)
    })

    it('should handle malformed log data gracefully', async () => {
      const logger = createLogger({
        name: 'malformed',
        transports: [createMemoryTransport({ name: 'malformed-logs' })],
      })

      // Log with circular references (should be handled by Pino)
      const circular: any = { prop: 'value' }
      circular.self = circular

      logger.info({ data: circular }, 'Log with circular ref')
      logger.info('Normal log')

      await new Promise((resolve) => setTimeout(resolve, 100))

      const logs = getMemoryLogs('malformed-logs')
      expect(logs.length).toBeGreaterThan(0)
    })

    it('should handle empty queries correctly', async () => {
      const logger = createLogger({
        name: 'empty',
        transports: [createMemoryTransport({ name: 'empty-logs' })],
      })

      logger.info('Single log')

      await new Promise((resolve) => setTimeout(resolve, 100))

      // Query with future timestamp (no results)
      const futureTime = Date.now() + 100000
      const logs = getMemoryLogs('empty-logs', { since: futureTime })
      expect(logs).toEqual([])
    })
  })
})

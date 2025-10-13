import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  createMemoryTransport,
  getMemoryLogs,
  clearMemoryLogs,
  getMemoryLogSize,
  getAllMemoryStoreNames,
} from '../../../src/utils/logger/transports/memory'
import { createLogger } from '../../../src/utils/logger'

describe('Memory Transport', () => {
  beforeEach(() => {
    // Clear all memory stores before each test
    getAllMemoryStoreNames().forEach((name) => clearMemoryLogs(name))
  })

  afterEach(() => {
    // Clean up after each test
    getAllMemoryStoreNames().forEach((name) => clearMemoryLogs(name))
  })

  describe('createMemoryTransport', () => {
    it('should create a memory transport with default options', () => {
      const transport = createMemoryTransport()

      expect(transport).toHaveProperty('level', 'info')
      expect(transport).toHaveProperty('stream')
      expect(transport.stream).toBeDefined()
    })

    it('should create a memory transport with custom level', () => {
      const transport = createMemoryTransport({ level: 'debug' })

      expect(transport.level).toBe('debug')
    })

    it('should create a memory transport with custom name', () => {
      createMemoryTransport({ name: 'test-logger' })

      const names = getAllMemoryStoreNames()
      expect(names).toContain('test-logger')
    })

    it('should use "default" name if not provided', () => {
      createMemoryTransport()

      const names = getAllMemoryStoreNames()
      expect(names).toContain('default')
    })

    it('should create a memory transport with custom maxSize', () => {
      const logger = createLogger({
        name: 'test',
        transports: [createMemoryTransport({ name: 'size-test', maxSize: 5 })],
      })

      // Log more than maxSize
      for (let i = 0; i < 10; i++) {
        logger.info(`Message ${i}`)
      }

      // Wait for async writes
      return new Promise((resolve) => {
        setTimeout(() => {
          const size = getMemoryLogSize('size-test')
          expect(size).toBe(5) // Should only keep last 5
          resolve(undefined)
        }, 100)
      })
    })
  })

  describe('log storage', () => {
    it('should capture logs from logger', () => {
      const logger = createLogger({
        name: 'test',
        transports: [createMemoryTransport({ name: 'capture-test' })],
      })

      logger.info({ userId: 123 }, 'User logged in')

      return new Promise((resolve) => {
        setTimeout(() => {
          const logs = getMemoryLogs('capture-test')
          expect(logs).toHaveLength(1)
          expect(logs[0]).toMatchObject({
            msg: 'User logged in',
            userId: 123,
          })
          resolve(undefined)
        }, 50)
      })
    })

    it('should capture multiple logs', () => {
      const logger = createLogger({
        name: 'test',
        transports: [createMemoryTransport({ name: 'multi-test' })],
      })

      logger.info('First log')
      logger.warn('Second log')
      logger.error('Third log')

      return new Promise((resolve) => {
        setTimeout(() => {
          const logs = getMemoryLogs('multi-test')
          expect(logs).toHaveLength(3)
          resolve(undefined)
        }, 50)
      })
    })

    it('should maintain circular buffer at maxSize', () => {
      const logger = createLogger({
        name: 'test',
        transports: [createMemoryTransport({ name: 'circular-test', maxSize: 3 })],
      })

      logger.info('Log 1')
      logger.info('Log 2')
      logger.info('Log 3')
      logger.info('Log 4')
      logger.info('Log 5')

      return new Promise((resolve) => {
        setTimeout(() => {
          const logs = getMemoryLogs('circular-test')
          expect(logs).toHaveLength(3)
          expect(logs[0]).toMatchObject({ msg: 'Log 3' })
          expect(logs[1]).toMatchObject({ msg: 'Log 4' })
          expect(logs[2]).toMatchObject({ msg: 'Log 5' })
          resolve(undefined)
        }, 50)
      })
    })
  })

  describe('getMemoryLogs', () => {
    it('should return empty array for non-existent store', () => {
      const logs = getMemoryLogs('non-existent')
      expect(logs).toEqual([])
    })

    it('should return all logs in raw format by default', () => {
      const logger = createLogger({
        name: 'test',
        transports: [createMemoryTransport({ name: 'raw-test' })],
      })

      logger.info({ userId: 123 }, 'Test message')

      return new Promise((resolve) => {
        setTimeout(() => {
          const logs = getMemoryLogs('raw-test')
          expect(logs).toHaveLength(1)
          expect(logs[0]).toHaveProperty('level', 30) // info = 30
          expect(logs[0]).toHaveProperty('time')
          expect(logs[0]).toHaveProperty('msg', 'Test message')
          resolve(undefined)
        }, 50)
      })
    })

    it('should return logs in parsed format', () => {
      const logger = createLogger({
        name: 'test',
        transports: [createMemoryTransport({ name: 'parsed-test' })],
      })

      logger.info({ userId: 123 }, 'Test message')

      return new Promise((resolve) => {
        setTimeout(() => {
          const logs = getMemoryLogs('parsed-test', { format: 'parsed' })
          expect(logs).toHaveLength(1)
          expect(logs[0]).toHaveProperty('level', 'info')
          expect(logs[0]).toHaveProperty('timestamp')
          expect(logs[0]).toHaveProperty('message', 'Test message')
          expect(logs[0]).toHaveProperty('userId', 123)
          resolve(undefined)
        }, 50)
      })
    })

    it('should filter logs by timestamp', () => {
      const logger = createLogger({
        name: 'test',
        transports: [createMemoryTransport({ name: 'time-test' })],
      })

      const now = Date.now()
      logger.info('Old log')

      return new Promise((resolve) => {
        setTimeout(() => {
          logger.info('New log')

          setTimeout(() => {
            const recentLogs = getMemoryLogs('time-test', { since: now + 50 })
            expect(recentLogs).toHaveLength(1)
            expect(recentLogs[0]).toMatchObject({ msg: 'New log' })
            resolve(undefined)
          }, 50)
        }, 100)
      })
    })

    it('should filter logs by single level', () => {
      const logger = createLogger({
        name: 'test',
        transports: [createMemoryTransport({ name: 'level-test' })],
      })

      logger.info('Info log')
      logger.error('Error log')
      logger.warn('Warn log')

      return new Promise((resolve) => {
        setTimeout(() => {
          const errorLogs = getMemoryLogs('level-test', { level: 'error' })
          expect(errorLogs).toHaveLength(1)
          expect(errorLogs[0]).toMatchObject({ msg: 'Error log' })
          resolve(undefined)
        }, 50)
      })
    })

    it('should filter logs by multiple levels', () => {
      const logger = createLogger({
        name: 'test',
        transports: [createMemoryTransport({ name: 'multi-level-test' })],
      })

      logger.info('Info log')
      logger.error('Error log')
      logger.warn('Warn log')
      logger.debug('Debug log')

      return new Promise((resolve) => {
        setTimeout(() => {
          const logs = getMemoryLogs('multi-level-test', {
            level: ['error', 'warn'],
          })
          expect(logs).toHaveLength(2)
          expect(logs[0]).toMatchObject({ msg: 'Error log' })
          expect(logs[1]).toMatchObject({ msg: 'Warn log' })
          resolve(undefined)
        }, 50)
      })
    })

    it('should combine timestamp and level filters', () => {
      const logger = createLogger({
        name: 'test',
        transports: [createMemoryTransport({ name: 'combined-test' })],
      })

      const now = Date.now()
      logger.info('Old info')
      logger.error('Old error')

      return new Promise((resolve) => {
        setTimeout(() => {
          logger.info('New info')
          logger.error('New error')

          setTimeout(() => {
            const logs = getMemoryLogs('combined-test', {
              since: now + 50,
              level: 'error',
            })
            expect(logs).toHaveLength(1)
            expect(logs[0]).toMatchObject({ msg: 'New error' })
            resolve(undefined)
          }, 50)
        }, 100)
      })
    })

    it('should combine all filters with parsed format', () => {
      const logger = createLogger({
        name: 'test',
        transports: [createMemoryTransport({ name: 'all-filters-test' })],
      })

      const now = Date.now()
      logger.info('Old info')
      logger.warn('Old warn')

      return new Promise((resolve) => {
        setTimeout(() => {
          logger.info('New info')
          logger.warn('New warn')

          setTimeout(() => {
            const logs = getMemoryLogs('all-filters-test', {
              since: now + 50,
              level: 'warn',
              format: 'parsed',
            })
            expect(logs).toHaveLength(1)
            expect(logs[0]).toMatchObject({
              level: 'warn',
              message: 'New warn',
            })
            resolve(undefined)
          }, 50)
        }, 100)
      })
    })
  })

  describe('clearMemoryLogs', () => {
    it('should clear all logs from a store', () => {
      const logger = createLogger({
        name: 'test',
        transports: [createMemoryTransport({ name: 'clear-test' })],
      })

      logger.info('Log 1')
      logger.info('Log 2')

      return new Promise((resolve) => {
        setTimeout(() => {
          expect(getMemoryLogSize('clear-test')).toBeGreaterThan(0)
          clearMemoryLogs('clear-test')
          expect(getMemoryLogSize('clear-test')).toBe(0)
          resolve(undefined)
        }, 50)
      })
    })

    it('should not affect other stores', () => {
      const logger1 = createLogger({
        name: 'test1',
        transports: [createMemoryTransport({ name: 'store1' })],
      })
      const logger2 = createLogger({
        name: 'test2',
        transports: [createMemoryTransport({ name: 'store2' })],
      })

      logger1.info('Log 1')
      logger2.info('Log 2')

      return new Promise((resolve) => {
        setTimeout(() => {
          clearMemoryLogs('store1')
          expect(getMemoryLogSize('store1')).toBe(0)
          expect(getMemoryLogSize('store2')).toBe(1)
          resolve(undefined)
        }, 50)
      })
    })
  })

  describe('getMemoryLogSize', () => {
    it('should return 0 for non-existent store', () => {
      expect(getMemoryLogSize('non-existent')).toBe(0)
    })

    it('should return correct size', () => {
      const logger = createLogger({
        name: 'test',
        transports: [createMemoryTransport({ name: 'size-count-test' })],
      })

      logger.info('Log 1')
      logger.info('Log 2')
      logger.info('Log 3')

      return new Promise((resolve) => {
        setTimeout(() => {
          expect(getMemoryLogSize('size-count-test')).toBe(3)
          resolve(undefined)
        }, 50)
      })
    })
  })

  describe('getAllMemoryStoreNames', () => {
    it('should return all store names', () => {
      // Clear existing stores first
      getAllMemoryStoreNames().forEach((name) => clearMemoryLogs(name))

      createMemoryTransport({ name: 'store1' })
      createMemoryTransport({ name: 'store2' })
      createMemoryTransport({ name: 'store3' })

      const names = getAllMemoryStoreNames()
      expect(names).toContain('store1')
      expect(names).toContain('store2')
      expect(names).toContain('store3')
    })

    it('should include all stores created across tests', () => {
      const names = getAllMemoryStoreNames()
      expect(names.length).toBeGreaterThan(0)
      expect(Array.isArray(names)).toBe(true)
    })
  })

  describe('parsed format fields', () => {
    it('should include custom fields in parsed format', () => {
      const logger = createLogger({
        name: 'test',
        transports: [createMemoryTransport({ name: 'custom-fields-test' })],
      })

      logger.info(
        {
          userId: 123,
          requestId: 'req-456',
          action: 'login',
        },
        'User action'
      )

      return new Promise((resolve) => {
        setTimeout(() => {
          const logs = getMemoryLogs('custom-fields-test', { format: 'parsed' })
          expect(logs).toHaveLength(1)
          expect(logs[0]).toMatchObject({
            level: 'info',
            message: 'User action',
            userId: 123,
            requestId: 'req-456',
            action: 'login',
          })
          resolve(undefined)
        }, 50)
      })
    })

    it('should exclude standard pino fields in parsed format extras', () => {
      const logger = createLogger({
        name: 'test',
        transports: [createMemoryTransport({ name: 'standard-fields-test' })],
      })

      logger.info('Test')

      return new Promise((resolve) => {
        setTimeout(() => {
          const logs = getMemoryLogs('standard-fields-test', { format: 'parsed' })
          expect(logs).toHaveLength(1)
          // Should have standard fields
          expect(logs[0]).toHaveProperty('level')
          expect(logs[0]).toHaveProperty('timestamp')
          expect(logs[0]).toHaveProperty('message')
          // Should NOT duplicate them
          expect(logs[0]).not.toHaveProperty('time')
          expect(logs[0]).not.toHaveProperty('msg')
          resolve(undefined)
        }, 50)
      })
    })
  })
})

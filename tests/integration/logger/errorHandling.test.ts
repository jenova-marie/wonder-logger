/**
 * Integration tests for error handling and serialization
 *
 * Tests error logging, serialization edge cases, and robustness
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createLogger } from '../../../src/utils/logger'
import { Writable } from 'node:stream'

describe('Logger Integration - Error Handling and Serialization', () => {
  let capturedLogs: string[] = []
  let captureStream: Writable

  beforeEach(() => {
    capturedLogs = []
    captureStream = new Writable({
      write(chunk, encoding, callback) {
        capturedLogs.push(chunk.toString())
        callback()
      },
    })
  })

  afterEach(() => {
    capturedLogs = []
  })

  it('should serialize standard Error objects', () => {
    const logger = createLogger({
      name: 'error-service',
      level: 'error',
      transports: [{ level: 'error', stream: captureStream }],
    })

    const error = new Error('Something went wrong')
    logger.error({ err: error }, 'Error occurred')

    const log = JSON.parse(capturedLogs[0])
    expect(log.err.type).toBe('Error')
    expect(log.err.message).toBe('Something went wrong')
    expect(log.err.stack).toContain('Error: Something went wrong')
  })

  it('should serialize custom Error types', () => {
    class CustomError extends Error {
      constructor(message: string, public code: string) {
        super(message)
        this.name = 'CustomError'
      }
    }

    const logger = createLogger({
      name: 'custom-error-service',
      level: 'error',
      transports: [{ level: 'error', stream: captureStream }],
    })

    const error = new CustomError('Custom error occurred', 'ERR_CUSTOM')
    logger.error({ err: error }, 'Custom error logged')

    const log = JSON.parse(capturedLogs[0])
    expect(log.err.type).toBe('CustomError')
    expect(log.err.message).toBe('Custom error occurred')
  })

  it('should handle errors with additional properties', () => {
    const logger = createLogger({
      name: 'extended-error-service',
      level: 'error',
      transports: [{ level: 'error', stream: captureStream }],
    })

    const error: any = new Error('Database connection failed')
    error.statusCode = 500
    error.retryable = true
    error.host = 'localhost'
    error.port = 5432

    logger.error({ err: error }, 'Database error')

    const log = JSON.parse(capturedLogs[0])
    expect(log.err.message).toBe('Database connection failed')
    // Additional properties may or may not be serialized depending on pino config
  })

  it('should handle circular reference objects gracefully', () => {
    const logger = createLogger({
      name: 'circular-service',
      level: 'info',
      transports: [{ level: 'info', stream: captureStream }],
    })

    const obj: any = { name: 'test' }
    obj.self = obj // Create circular reference

    // Pino handles circular references automatically
    logger.info({ data: obj }, 'Object with circular reference')

    expect(capturedLogs).toHaveLength(1)
    const log = JSON.parse(capturedLogs[0])
    expect(log.data.name).toBe('test')
  })

  it('should handle very large objects', () => {
    const logger = createLogger({
      name: 'large-object-service',
      level: 'info',
      transports: [{ level: 'info', stream: captureStream }],
    })

    const largeArray = Array.from({ length: 1000 }, (_, i) => ({
      id: i,
      name: `item-${i}`,
      data: `data-${i}`.repeat(10),
    }))

    logger.info({ items: largeArray }, 'Large object logged')

    expect(capturedLogs).toHaveLength(1)
    const log = JSON.parse(capturedLogs[0])
    expect(log.items).toHaveLength(1000)
  })

  it('should serialize special JavaScript types', () => {
    const logger = createLogger({
      name: 'special-types-service',
      level: 'info',
      transports: [{ level: 'info', stream: captureStream }],
    })

    logger.info(
      {
        date: new Date('2025-10-07T00:00:00Z'),
        regex: /test-pattern/gi,
        map: new Map([
          ['key1', 'value1'],
          ['key2', 'value2'],
        ]),
        set: new Set([1, 2, 3]),
      },
      'Special types'
    )

    const log = JSON.parse(capturedLogs[0])
    expect(log.date).toBeDefined()
    expect(log.regex).toBeDefined()
  })

  it('should handle undefined and null values', () => {
    const logger = createLogger({
      name: 'null-service',
      level: 'info',
      transports: [{ level: 'info', stream: captureStream }],
    })

    logger.info(
      {
        nullValue: null,
        undefinedValue: undefined,
        emptyString: '',
        zero: 0,
        falseValue: false,
      },
      'Null and undefined'
    )

    const log = JSON.parse(capturedLogs[0])
    expect(log.nullValue).toBeNull()
    expect(log.emptyString).toBe('')
    expect(log.zero).toBe(0)
    expect(log.falseValue).toBe(false)
  })

  it('should handle stream write errors', () => {
    let errorCaught = false
    const faultyStream = new Writable({
      write(chunk, encoding, callback) {
        // Simulate stream error
        const error = new Error('Stream write failed')
        errorCaught = true
        callback(error)
      },
    })

    faultyStream.on('error', () => {
      // Suppress error output
    })

    const logger = createLogger({
      name: 'faulty-service',
      level: 'info',
      transports: [{ level: 'info', stream: faultyStream }],
    })

    // Attempt to log
    try {
      logger.info('This may cause stream error')
    } catch (error) {
      // Stream errors may or may not be thrown depending on pino's internal handling
    }

    // Verify that write was attempted
    expect(errorCaught).toBe(true)
  })

  it('should handle multiple errors in sequence', () => {
    const logger = createLogger({
      name: 'multi-error-service',
      level: 'error',
      transports: [{ level: 'error', stream: captureStream }],
    })

    const error1 = new Error('First error')
    const error2 = new Error('Second error')
    const error3 = new Error('Third error')

    logger.error({ err: error1 }, 'Error 1')
    logger.error({ err: error2 }, 'Error 2')
    logger.error({ err: error3 }, 'Error 3')

    expect(capturedLogs).toHaveLength(3)
    const log1 = JSON.parse(capturedLogs[0])
    const log2 = JSON.parse(capturedLogs[1])
    const log3 = JSON.parse(capturedLogs[2])

    expect(log1.err.message).toBe('First error')
    expect(log2.err.message).toBe('Second error')
    expect(log3.err.message).toBe('Third error')
  })

  it('should handle async errors in promise chains', async () => {
    const logger = createLogger({
      name: 'async-error-service',
      level: 'error',
      transports: [{ level: 'error', stream: captureStream }],
    })

    async function failingOperation() {
      throw new Error('Async operation failed')
    }

    try {
      await failingOperation()
    } catch (error) {
      logger.error({ err: error }, 'Caught async error')
    }

    expect(capturedLogs).toHaveLength(1)
    const log = JSON.parse(capturedLogs[0])
    expect(log.err.message).toBe('Async operation failed')
  })

  it('should handle high-frequency logging', () => {
    const logger = createLogger({
      name: 'high-freq-service',
      level: 'info',
      transports: [{ level: 'info', stream: captureStream }],
    })

    // Log 1000 messages rapidly
    for (let i = 0; i < 1000; i++) {
      logger.info({ index: i }, `Message ${i}`)
    }

    expect(capturedLogs).toHaveLength(1000)
    const firstLog = JSON.parse(capturedLogs[0])
    const lastLog = JSON.parse(capturedLogs[999])
    expect(firstLog.index).toBe(0)
    expect(lastLog.index).toBe(999)
  })

  it('should handle deeply nested objects', () => {
    const logger = createLogger({
      name: 'deep-nest-service',
      level: 'info',
      transports: [{ level: 'info', stream: captureStream }],
    })

    const deepObject: any = { level: 0 }
    let current = deepObject
    for (let i = 1; i <= 50; i++) {
      current.nested = { level: i }
      current = current.nested
    }

    logger.info({ data: deepObject }, 'Deeply nested object')

    expect(capturedLogs).toHaveLength(1)
    const log = JSON.parse(capturedLogs[0])
    expect(log.data.level).toBe(0)
  })

  it('should handle buffers and binary data', () => {
    const logger = createLogger({
      name: 'buffer-service',
      level: 'info',
      transports: [{ level: 'info', stream: captureStream }],
    })

    const buffer = Buffer.from('Hello, World!', 'utf-8')
    logger.info({ data: buffer }, 'Buffer logged')

    expect(capturedLogs).toHaveLength(1)
    const log = JSON.parse(capturedLogs[0])
    expect(log.data).toBeDefined()
  })

  it('should handle mixed error and data context', () => {
    const logger = createLogger({
      name: 'mixed-context-service',
      level: 'error',
      transports: [{ level: 'error', stream: captureStream }],
    })

    const error = new Error('Operation failed')
    logger.error(
      {
        err: error,
        userId: 123,
        operation: 'update-profile',
        timestamp: new Date(),
        metadata: {
          retryCount: 3,
          lastAttempt: '2025-10-07T00:00:00Z',
        },
      },
      'Failed operation with context'
    )

    const log = JSON.parse(capturedLogs[0])
    expect(log.err.message).toBe('Operation failed')
    expect(log.userId).toBe(123)
    expect(log.operation).toBe('update-profile')
    expect(log.metadata.retryCount).toBe(3)
  })
})

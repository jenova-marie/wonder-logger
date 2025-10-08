/**
 * Integration tests for basic logger functionality
 *
 * These tests verify real logging behavior without mocks
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createLogger } from '../../../src/utils/logger'
import { Writable } from 'node:stream'

describe('Logger Integration - Basic Functionality', () => {
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

  it('should create a logger and log info messages', () => {
    const logger = createLogger({
      name: 'test-service',
      level: 'info',
      transports: [
        {
          level: 'info',
          stream: captureStream,
        },
      ],
    })

    logger.info({ userId: 123 }, 'User logged in')

    expect(capturedLogs).toHaveLength(1)
    const log = JSON.parse(capturedLogs[0])
    expect(log.level).toBe(30) // info level
    expect(log.msg).toBe('User logged in')
    expect(log.userId).toBe(123)
    expect(log.service).toBe('test-service')
  })

  it('should respect log levels', () => {
    const logger = createLogger({
      name: 'test-service',
      level: 'warn',
      transports: [
        {
          level: 'warn',
          stream: captureStream,
        },
      ],
    })

    logger.debug('Should not appear')
    logger.info('Should not appear')
    logger.warn('Should appear')
    logger.error('Should appear')

    expect(capturedLogs).toHaveLength(2)
    const warn = JSON.parse(capturedLogs[0])
    const error = JSON.parse(capturedLogs[1])
    expect(warn.level).toBe(40) // warn
    expect(error.level).toBe(50) // error
  })

  it('should include base fields in every log', () => {
    const logger = createLogger({
      name: 'test-service',
      level: 'info',
      base: {
        environment: 'test',
        version: '1.0.0',
      },
      transports: [
        {
          level: 'info',
          stream: captureStream,
        },
      ],
    })

    logger.info('Test message')

    const log = JSON.parse(capturedLogs[0])
    expect(log.environment).toBe('test')
    expect(log.version).toBe('1.0.0')
    expect(log.service).toBe('test-service')
  })

  it('should handle child loggers', () => {
    const logger = createLogger({
      name: 'parent-service',
      level: 'info',
      transports: [
        {
          level: 'info',
          stream: captureStream,
        },
      ],
    })

    const child = logger.child({ requestId: 'req-123' })
    child.info('Child log message')

    const log = JSON.parse(capturedLogs[0])
    expect(log.requestId).toBe('req-123')
    expect(log.service).toBe('parent-service')
  })

  it('should serialize errors properly', () => {
    const logger = createLogger({
      name: 'test-service',
      level: 'info',
      transports: [
        {
          level: 'info',
          stream: captureStream,
        },
      ],
    })

    const error = new Error('Test error')
    error.stack = 'Error: Test error\n    at test.ts:1:1'
    logger.error({ err: error }, 'An error occurred')

    const log = JSON.parse(capturedLogs[0])
    expect(log.err.type).toBe('Error')
    expect(log.err.message).toBe('Test error')
    expect(log.err.stack).toContain('Error: Test error')
  })

  it('should handle multiple log entries in sequence', () => {
    const logger = createLogger({
      name: 'test-service',
      level: 'info',
      transports: [
        {
          level: 'info',
          stream: captureStream,
        },
      ],
    })

    logger.info({ step: 1 }, 'First step')
    logger.info({ step: 2 }, 'Second step')
    logger.info({ step: 3 }, 'Third step')

    expect(capturedLogs).toHaveLength(3)
    const logs = capturedLogs.map((l) => JSON.parse(l))
    expect(logs[0].step).toBe(1)
    expect(logs[1].step).toBe(2)
    expect(logs[2].step).toBe(3)
  })

  it('should handle complex nested objects', () => {
    const logger = createLogger({
      name: 'test-service',
      level: 'info',
      transports: [
        {
          level: 'info',
          stream: captureStream,
        },
      ],
    })

    const complexObject = {
      user: {
        id: 123,
        profile: {
          name: 'John Doe',
          settings: {
            theme: 'dark',
            notifications: true,
          },
        },
      },
      metadata: {
        timestamp: '2025-10-07T00:00:00Z',
        tags: ['api', 'user', 'login'],
      },
    }

    logger.info(complexObject, 'Complex object logged')

    const log = JSON.parse(capturedLogs[0])
    expect(log.user.id).toBe(123)
    expect(log.user.profile.name).toBe('John Doe')
    expect(log.user.profile.settings.theme).toBe('dark')
    expect(log.metadata.tags).toEqual(['api', 'user', 'login'])
  })
})

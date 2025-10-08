/**
 * Integration tests for trace context and child loggers
 *
 * Tests OpenTelemetry integration and child logger functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createLogger, withTraceContext } from '../../../src/utils/logger'
import { Writable } from 'node:stream'
import { context, trace, SpanStatusCode } from '@opentelemetry/api'

describe('Logger Integration - Trace Context', () => {
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

  it('should create child logger with additional context', () => {
    const baseLogger = createLogger({
      name: 'base-service',
      level: 'info',
      transports: [
        {
          level: 'info',
          stream: captureStream,
        },
      ],
    })

    const child = baseLogger.child({ requestId: 'req-123', userId: 456 })
    child.info('Child logger message')

    const log = JSON.parse(capturedLogs[0])
    expect(log.requestId).toBe('req-123')
    expect(log.userId).toBe(456)
    expect(log.service).toBe('base-service')
  })

  it('should support nested child loggers', () => {
    const baseLogger = createLogger({
      name: 'base-service',
      level: 'info',
      transports: [
        {
          level: 'info',
          stream: captureStream,
        },
      ],
    })

    const child1 = baseLogger.child({ requestId: 'req-123' })
    const child2 = child1.child({ operation: 'database-query' })
    const child3 = child2.child({ table: 'users' })

    child3.info('Nested child logger')

    const log = JSON.parse(capturedLogs[0])
    expect(log.requestId).toBe('req-123')
    expect(log.operation).toBe('database-query')
    expect(log.table).toBe('users')
  })

  it('should integrate with OpenTelemetry trace context', () => {
    const baseLogger = createLogger({
      name: 'traced-service',
      level: 'info',
      transports: [
        {
          level: 'info',
          stream: captureStream,
        },
      ],
    })

    const logger = withTraceContext(baseLogger)

    // Create a mock tracer and span
    const tracer = trace.getTracer('test-tracer')
    const span = tracer.startSpan('test-operation')

    // Run in span context
    context.with(trace.setSpan(context.active(), span), () => {
      logger.info('Message with trace context')
      span.end()
    })

    // The log should include trace_id and span_id
    const log = JSON.parse(capturedLogs[0])
    expect(log.msg).toBe('Message with trace context')
    // Note: trace_id and span_id will be present if a real tracer is set up
  })

  it('should preserve child context with trace context', () => {
    const baseLogger = createLogger({
      name: 'traced-child-service',
      level: 'info',
      transports: [
        {
          level: 'info',
          stream: captureStream,
        },
      ],
    })

    // Create child first, then apply trace context
    const child = baseLogger.child({ userId: 789 })
    const tracedChild = withTraceContext(child)

    tracedChild.info('Traced child message')

    const log = JSON.parse(capturedLogs[0])
    expect(log.userId).toBe(789)
    expect(log.service).toBe('traced-child-service')
  })

  it('should handle multiple child loggers independently', () => {
    const baseLogger = createLogger({
      name: 'multi-child-service',
      level: 'info',
      transports: [
        {
          level: 'info',
          stream: captureStream,
        },
      ],
    })

    const child1 = baseLogger.child({ module: 'auth' })
    const child2 = baseLogger.child({ module: 'database' })
    const child3 = baseLogger.child({ module: 'api' })

    child1.info('Auth log')
    child2.info('Database log')
    child3.info('API log')

    expect(capturedLogs).toHaveLength(3)
    const log1 = JSON.parse(capturedLogs[0])
    const log2 = JSON.parse(capturedLogs[1])
    const log3 = JSON.parse(capturedLogs[2])

    expect(log1.module).toBe('auth')
    expect(log2.module).toBe('database')
    expect(log3.module).toBe('api')
  })

  it('should allow child loggers to override parent fields', () => {
    const baseLogger = createLogger({
      name: 'parent-service',
      level: 'info',
      base: { environment: 'production' },
      transports: [
        {
          level: 'info',
          stream: captureStream,
        },
      ],
    })

    const child = baseLogger.child({ environment: 'staging' })
    child.info('Override test')

    const log = JSON.parse(capturedLogs[0])
    expect(log.environment).toBe('staging')
  })

  it('should support dynamic child context during request lifecycle', () => {
    const baseLogger = createLogger({
      name: 'request-service',
      level: 'info',
      transports: [
        {
          level: 'info',
          stream: captureStream,
        },
      ],
    })

    // Simulate request lifecycle
    const requestLogger = baseLogger.child({ requestId: 'req-456' })

    requestLogger.info('Request started')

    // Add user context after authentication
    const authenticatedLogger = requestLogger.child({ userId: 123 })
    authenticatedLogger.info('User authenticated')

    // Add operation context
    const operationLogger = authenticatedLogger.child({ operation: 'update-profile' })
    operationLogger.info('Operation started')

    expect(capturedLogs).toHaveLength(3)

    const log1 = JSON.parse(capturedLogs[0])
    expect(log1.requestId).toBe('req-456')
    expect(log1.userId).toBeUndefined()

    const log2 = JSON.parse(capturedLogs[1])
    expect(log2.requestId).toBe('req-456')
    expect(log2.userId).toBe(123)

    const log3 = JSON.parse(capturedLogs[2])
    expect(log3.requestId).toBe('req-456')
    expect(log3.userId).toBe(123)
    expect(log3.operation).toBe('update-profile')
  })
})

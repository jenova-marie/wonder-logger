/**
 * Integration tests for ts-rust-result DomainError serialization with Pino logger
 *
 * Verifies that Wonder Logger properly handles and serializes ts-rust-result
 * error objects using toLogContext() helper.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createLogger, createMemoryTransport, getMemoryLogs, clearMemoryLogs } from '../../../src/index.js'
import { loadConfig, parseJSONResponse } from '../../../src/index.js'
import type { ConfigError, JSONError } from '../../../src/index.js'
import { toLogContext, toFlatLogContext } from '@jenova-marie/ts-rust-result/observability'
import { vol } from 'memfs'

// Mock fs for config tests
vi.mock('fs/promises', async () => {
  const memfs = await import('memfs')
  return memfs.fs.promises
})

vi.mock('fs', async () => {
  const memfs = await import('memfs')
  return { default: memfs.fs }
})

describe('Integration: DomainError Serialization with Pino', () => {
  const testStoreName = 'result-errors-test'
  let logger: any

  beforeEach(() => {
    vol.reset()
    clearMemoryLogs(testStoreName)
    logger = createLogger({
      name: 'test',
      level: 'debug',
      transports: [createMemoryTransport({ name: testStoreName })]
    })
  })

  afterEach(() => {
    clearMemoryLogs(testStoreName)
  })

  describe('ConfigError Serialization', () => {
    it('should serialize FileNotFound error with toLogContext', async () => {
      // Trigger FileNotFound error
      const result = loadConfig({ configPath: '/nonexistent/config.yaml' })

      expect(result.ok).toBe(false)
      if (!result.ok) {
        // Log error using toLogContext
        logger.error(toLogContext(result.error), 'Failed to load config')

        // Wait for async writes
        await new Promise((resolve) => setTimeout(resolve, 100))

        const logs = getMemoryLogs(testStoreName, { format: 'parsed' })
        expect(logs).toHaveLength(1)

        const log = logs[0]
        expect(log.level).toBe('error')
        expect(log.message).toBe('Failed to load config')

        // Verify structured error fields from toLogContext
        expect(log.error_kind).toBe('FileNotFound')
        expect(log.error_message).toContain('File not found')
        expect(log.error_context).toBeDefined()
        expect((log.error_context as any).path).toBe('/nonexistent/config.yaml')
        expect(log.error_timestamp).toBeDefined()
      }
    })

    it('should serialize SchemaValidation error with nested context', async () => {
      vol.fromJSON({
        '/app/config.yaml': 'service:\n  name: test\nlogger:\n  level: invalid_level'
      })

      const result = loadConfig({ configPath: '/app/config.yaml' })

      expect(result.ok).toBe(false)
      if (!result.ok) {
        logger.error(toLogContext(result.error), 'Config validation failed')

        await new Promise((resolve) => setTimeout(resolve, 100))

        const logs = getMemoryLogs(testStoreName, { format: 'parsed' })
        const log = logs[0]

        expect(log.error_kind).toBe('SchemaValidation')
        expect(log.error_message).toContain('validation failed')
        expect(log.error_context).toBeDefined()
        expect((log.error_context as any).issues).toBeDefined()
      }
    })

    it('should use flat log context for Loki-style labels', async () => {
      const result = loadConfig({ configPath: '/missing.yaml' })

      expect(result.ok).toBe(false)
      if (!result.ok) {
        // Use toFlatLogContext for label-friendly format
        logger.error(toFlatLogContext(result.error), 'Config load failed')

        await new Promise((resolve) => setTimeout(resolve, 100))

        const logs = getMemoryLogs(testStoreName, { format: 'parsed' })
        const log = logs[0]

        // Flat context - all string/number/boolean values
        expect(typeof log.error_kind).toBe('string')
        expect(typeof log.error_message).toBe('string')
        // Context fields are flattened with prefix
        expect(log.error_context_path).toBe('/missing.yaml')
      }
    })
  })

  describe('JSONError Serialization', () => {
    it('should serialize JSONParseError with toLogContext', async () => {
      const invalidJSON = '{broken json}'
      const result = parseJSONResponse(invalidJSON)

      expect(result.ok).toBe(false)
      if (!result.ok) {
        logger.error(toLogContext(result.error), 'JSON parse failed')

        await new Promise((resolve) => setTimeout(resolve, 100))

        const logs = getMemoryLogs(testStoreName, { format: 'parsed' })
        const log = logs[0]

        expect(log.error_kind).toBe('JSONExtractionError')
        expect(log.error_message).toContain('Failed to parse JSON')
        expect(log.error_context).toBeDefined()
        expect((log.error_context as any).textPreview).toBeDefined()
      }
    })

    it('should handle JSONStructureError with missing fields', async () => {
      const validJSON = '{"name": "test"}'
      const result = parseJSONResponse(validJSON)

      expect(result.ok).toBe(true)
      if (result.ok) {
        const { validateJSONStructure } = await import('../../../src/index.js')
        const validationResult = validateJSONStructure(result.value, ['name', 'age', 'email'])

        expect(validationResult.ok).toBe(false)
        if (!validationResult.ok) {
          logger.error(toLogContext(validationResult.error), 'Validation failed')

          await new Promise((resolve) => setTimeout(resolve, 100))

          const logs = getMemoryLogs(testStoreName, { format: 'parsed' })
          const log = logs[0]

          expect(log.error_kind).toBe('JSONStructureError')
          expect(log.error_context).toBeDefined()
          expect((log.error_context as any).missingFields).toEqual(['age', 'email'])
        }
      }
    })
  })

  describe('Error Spreading and Enrichment', () => {
    it('should spread toLogContext and add additional context', async () => {
      const result = loadConfig({ configPath: '/missing.yaml' })

      expect(result.ok).toBe(false)
      if (!result.ok) {
        logger.error({
          ...toLogContext(result.error),
          attemptedPath: process.cwd(),
          environment: 'test',
          userId: 123
        }, 'Config load failed with additional context')

        await new Promise((resolve) => setTimeout(resolve, 100))

        const logs = getMemoryLogs(testStoreName, { format: 'parsed' })
        const log = logs[0]

        // Error fields from toLogContext
        expect(log.error_kind).toBe('FileNotFound')
        expect(log.error_message).toBeDefined()

        // Additional enrichment
        expect(log.attemptedPath).toBe(process.cwd())
        expect(log.environment).toBe('test')
        expect(log.userId).toBe(123)
      }
    })
  })

  describe('Error Cause Chain Serialization', () => {
    it('should serialize nested error causes', async () => {
      // Create nested error manually for testing
      const { error } = await import('@jenova-marie/ts-rust-result/errors')

      const innerError = error('InnerError')
        .withMessage('Inner failure')
        .withContext({ detail: 'inner' })
        .build()

      const outerError = error('OuterError')
        .withMessage('Outer failure')
        .withContext({ detail: 'outer' })
        .withCause(innerError)
        .build()

      logger.error(toLogContext(outerError as any), 'Nested error logged')

      await new Promise((resolve) => setTimeout(resolve, 100))

      const logs = getMemoryLogs(testStoreName, { format: 'parsed' })
      const log = logs[0]

      // Outer error
      expect(log.error_kind).toBe('OuterError')
      expect(log.error_message).toBe('Outer failure')

      // Cause chain
      expect(log.error_cause).toBeDefined()
      const cause = log.error_cause as any
      expect(cause.error_kind).toBe('InnerError')
      expect(cause.error_message).toBe('Inner failure')
    })
  })

  describe('Pino Native Error Serialization', () => {
    it('should work alongside Pino err serializer', async () => {
      const result = loadConfig({ configPath: '/missing.yaml' })

      expect(result.ok).toBe(false)
      if (!result.ok) {
        // Both native Error and DomainError in same log
        const nativeError = new Error('Native error')

        logger.error({
          err: nativeError,  // Pino's built-in err serializer
          ...toLogContext(result.error)  // ts-rust-result DomainError
        }, 'Both error types logged')

        await new Promise((resolve) => setTimeout(resolve, 100))

        const logs = getMemoryLogs(testStoreName, { format: 'parsed' })
        const log = logs[0]

        // Native Error (via Pino err serializer)
        expect(log.err).toBeDefined()
        expect((log.err as any).message).toBe('Native error')

        // DomainError (via toLogContext)
        expect(log.error_kind).toBe('FileNotFound')
        expect(log.error_message).toBeDefined()
      }
    })
  })
})

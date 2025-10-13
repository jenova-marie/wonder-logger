import { describe, it, expect } from 'vitest'
import wonderLogger, {
  createLogger,
  createTelemetry,
  createConsoleTransport,
  createFileTransport,
  createOtelTransport,
  createMemoryTransport,
  withTraceContext,
  withSpan,
  createMorganStream,
} from '../../src/index'

describe('wonder-logger exports', () => {
  describe('named exports', () => {
    it('should export createLogger function', () => {
      expect(createLogger).toBeDefined()
      expect(typeof createLogger).toBe('function')
    })

    it('should export createTelemetry function', () => {
      expect(createTelemetry).toBeDefined()
      expect(typeof createTelemetry).toBe('function')
    })

    it('should export transport functions', () => {
      expect(createConsoleTransport).toBeDefined()
      expect(typeof createConsoleTransport).toBe('function')

      expect(createFileTransport).toBeDefined()
      expect(typeof createFileTransport).toBe('function')

      expect(createOtelTransport).toBeDefined()
      expect(typeof createOtelTransport).toBe('function')

      expect(createMemoryTransport).toBeDefined()
      expect(typeof createMemoryTransport).toBe('function')
    })

    it('should export plugin functions', () => {
      expect(withTraceContext).toBeDefined()
      expect(typeof withTraceContext).toBe('function')

      expect(createMorganStream).toBeDefined()
      expect(typeof createMorganStream).toBe('function')
    })

    it('should export withSpan function', () => {
      expect(withSpan).toBeDefined()
      expect(typeof withSpan).toBe('function')
    })
  })

  describe('default export', () => {
    it('should export all functions as default object', () => {
      expect(wonderLogger).toBeDefined()
      expect(wonderLogger.createLogger).toBe(createLogger)
      expect(wonderLogger.createTelemetry).toBe(createTelemetry)
      expect(wonderLogger.createConsoleTransport).toBe(createConsoleTransport)
      expect(wonderLogger.createFileTransport).toBe(createFileTransport)
      expect(wonderLogger.createOtelTransport).toBe(createOtelTransport)
      expect(wonderLogger.createMemoryTransport).toBe(createMemoryTransport)
      expect(wonderLogger.withTraceContext).toBe(withTraceContext)
      expect(wonderLogger.withSpan).toBe(withSpan)
      expect(wonderLogger.createMorganStream).toBe(createMorganStream)
    })
  })
})

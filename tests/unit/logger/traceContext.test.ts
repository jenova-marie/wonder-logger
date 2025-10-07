import { describe, it, expect, vi, beforeEach } from 'vitest'
import { withTraceContext } from '../../../src/utils/logger/plugins/traceContext'
import type pino from 'pino'

describe('traceContext plugin', () => {
  const createMockLogger = () => ({
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn(),
  } as unknown as pino.Logger)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('initialization', () => {
    it('should create wrapped logger successfully', () => {
      const logger = createMockLogger()

      expect(() => withTraceContext(logger)).not.toThrow()
    })

    it('should return a logger instance', () => {
      const logger = createMockLogger()
      const wrappedLogger = withTraceContext(logger)

      expect(wrappedLogger).toBeDefined()
      expect(wrappedLogger).toHaveProperty('info')
      expect(wrappedLogger).toHaveProperty('error')
    })
  })

  describe('log method wrapping', () => {
    it('should wrap all log methods', () => {
      const logger = createMockLogger()
      const wrappedLogger = withTraceContext(logger)

      const methods = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'] as const

      methods.forEach((method) => {
        wrappedLogger[method]('test message')
        expect(logger[method]).toHaveBeenCalled()
      })
    })

    it('should pass through string messages', () => {
      const logger = createMockLogger()
      const wrappedLogger = withTraceContext(logger)

      wrappedLogger.info('simple string message')

      expect(logger.info).toHaveBeenCalled()
      const call = vi.mocked(logger.info).mock.calls[0]
      expect(call[0]).toBe('simple string message')
    })

    it('should pass through object messages when no active span', () => {
      const logger = createMockLogger()
      const wrappedLogger = withTraceContext(logger)

      wrappedLogger.info({ userId: 123 }, 'test message')

      // Should be called with at least the object and message
      expect(logger.info).toHaveBeenCalled()
      const call = vi.mocked(logger.info).mock.calls[0]
      expect(call[0]).toHaveProperty('userId', 123)
      expect(call[1]).toBe('test message')
    })

    it('should handle object + message parameters', () => {
      const logger = createMockLogger()
      const wrappedLogger = withTraceContext(logger)

      wrappedLogger.error({ error: 'failed', userId: 456 }, 'Operation failed')

      expect(logger.error).toHaveBeenCalled()
      const call = vi.mocked(logger.error).mock.calls[0]
      expect(call[0]).toHaveProperty('error', 'failed')
      expect(call[0]).toHaveProperty('userId', 456)
      expect(call[1]).toBe('Operation failed')
    })

    it('should handle additional arguments', () => {
      const logger = createMockLogger()
      const wrappedLogger = withTraceContext(logger)

      wrappedLogger.info({ data: 'value' }, 'message %s', 'arg1')

      expect(logger.info).toHaveBeenCalled()
      const call = vi.mocked(logger.info).mock.calls[0]
      expect(call[1]).toBe('message %s')
      expect(call[2]).toBe('arg1')
    })

    it('should handle null object parameter', () => {
      const logger = createMockLogger()
      const wrappedLogger = withTraceContext(logger)

      wrappedLogger.info(null, 'message')

      expect(logger.info).toHaveBeenCalledWith(null, 'message')
    })

    it('should not modify original logger', () => {
      const logger = createMockLogger()
      const wrappedLogger = withTraceContext(logger)

      // Original logger should not be modified
      expect(wrappedLogger).not.toBe(logger)
    })
  })

  describe('non-logging methods passthrough', () => {
    it('should pass through child() method', () => {
      const mockChild = createMockLogger()
      const logger = createMockLogger()
      vi.mocked(logger.child).mockReturnValue(mockChild)

      const wrappedLogger = withTraceContext(logger)
      const child = wrappedLogger.child({ requestId: 'req-123' })

      expect(logger.child).toHaveBeenCalledWith({ requestId: 'req-123' })
      expect(child).toBe(mockChild)
    })

    it('should pass through other properties unchanged', () => {
      const logger = createMockLogger() as any
      logger.customProperty = 'custom value'
      logger.customMethod = vi.fn()

      const wrappedLogger = withTraceContext(logger) as any

      expect(wrappedLogger.customProperty).toBe('custom value')
      expect(typeof wrappedLogger.customMethod).toBe('function')

      wrappedLogger.customMethod('arg')
      expect(logger.customMethod).toHaveBeenCalledWith('arg')
    })
  })

  describe('trace context injection', () => {
    it('should inject trace context when available', () => {
      // This is a basic test - actual trace context requires active OTEL span
      // which would be present in integration tests
      const logger = createMockLogger()
      const wrappedLogger = withTraceContext(logger)

      wrappedLogger.info({ userId: 123 }, 'message')

      expect(logger.info).toHaveBeenCalled()
      // Context will be empty in unit tests without active span
    })
  })

  describe('error handling', () => {
    it('should not throw if logger methods are called', () => {
      const logger = createMockLogger()
      const wrappedLogger = withTraceContext(logger)

      expect(() => wrappedLogger.trace('msg')).not.toThrow()
      expect(() => wrappedLogger.debug('msg')).not.toThrow()
      expect(() => wrappedLogger.info('msg')).not.toThrow()
      expect(() => wrappedLogger.warn('msg')).not.toThrow()
      expect(() => wrappedLogger.error('msg')).not.toThrow()
      expect(() => wrappedLogger.fatal('msg')).not.toThrow()
    })
  })
})

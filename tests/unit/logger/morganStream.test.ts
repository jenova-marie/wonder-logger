import { describe, it, expect, vi } from 'vitest'
import { createMorganStream } from '../../../src/utils/logger/plugins/morganStream'
import type pino from 'pino'

describe('createMorganStream', () => {
  const createMockLogger = () => ({
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
  } as unknown as pino.Logger)

  describe('stream creation', () => {
    it('should create stream with write method', () => {
      const logger = createMockLogger()
      const stream = createMorganStream(logger)

      expect(stream).toHaveProperty('write')
      expect(typeof stream.write).toBe('function')
    })
  })

  describe('message logging', () => {
    it('should log message at info level by default', () => {
      const logger = createMockLogger()
      const stream = createMorganStream(logger)

      stream.write('GET /api/users 200')

      expect(logger.info).toHaveBeenCalledWith('GET /api/users 200')
    })

    it('should strip trailing newline from message', () => {
      const logger = createMockLogger()
      const stream = createMorganStream(logger)

      stream.write('POST /api/auth 201\n')

      expect(logger.info).toHaveBeenCalledWith('POST /api/auth 201')
    })

    it('should handle message without newline', () => {
      const logger = createMockLogger()
      const stream = createMorganStream(logger)

      stream.write('DELETE /api/items/123 204')

      expect(logger.info).toHaveBeenCalledWith('DELETE /api/items/123 204')
    })

    it('should handle empty string', () => {
      const logger = createMockLogger()
      const stream = createMorganStream(logger)

      stream.write('')

      expect(logger.info).toHaveBeenCalledWith('')
    })

    it('should handle only newline', () => {
      const logger = createMockLogger()
      const stream = createMorganStream(logger)

      stream.write('\n')

      expect(logger.info).toHaveBeenCalledWith('')
    })
  })

  describe('custom log level', () => {
    it('should use trace level when specified', () => {
      const logger = createMockLogger()
      const stream = createMorganStream(logger, 'trace')

      stream.write('request\n')

      expect(logger.trace).toHaveBeenCalledWith('request')
      expect(logger.info).not.toHaveBeenCalled()
    })

    it('should use debug level when specified', () => {
      const logger = createMockLogger()
      const stream = createMorganStream(logger, 'debug')

      stream.write('request\n')

      expect(logger.debug).toHaveBeenCalledWith('request')
    })

    it('should use warn level when specified', () => {
      const logger = createMockLogger()
      const stream = createMorganStream(logger, 'warn')

      stream.write('request\n')

      expect(logger.warn).toHaveBeenCalledWith('request')
    })

    it('should use error level when specified', () => {
      const logger = createMockLogger()
      const stream = createMorganStream(logger, 'error')

      stream.write('request\n')

      expect(logger.error).toHaveBeenCalledWith('request')
    })
  })
})

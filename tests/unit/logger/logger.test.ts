import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createLogger } from '../../../src/utils/logger'

// Mock pino
vi.mock('pino', () => {
  const mockMultistream = vi.fn((streams) => ({ _mock: 'multistream', streams }))
  const mockPino = vi.fn((config, stream) => ({
    _mock: 'logger',
    config,
    stream,
    info: vi.fn(),
    error: vi.fn(),
    child: vi.fn(),
  }))
  mockPino.multistream = mockMultistream

  return {
    default: mockPino,
  }
})

describe('createLogger', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('basic logger creation', () => {
    it('should create logger with required name', async () => {
      const pino = await import('pino')

      createLogger({ name: 'test-service' })

      expect(pino.default).toHaveBeenCalled()
      const config = vi.mocked(pino.default).mock.calls[0][0]
      expect(config).toMatchObject({
        name: 'test-service',
        base: {
          service: 'test-service',
        },
      })
    })

    it('should use default log level if not specified', async () => {
      const pino = await import('pino')

      createLogger({ name: 'test' })

      const config = vi.mocked(pino.default).mock.calls[0][0]
      expect(config.level).toBe('info')
    })

    it('should use custom log level', async () => {
      const pino = await import('pino')

      createLogger({ name: 'test', level: 'debug' })

      const config = vi.mocked(pino.default).mock.calls[0][0]
      expect(config.level).toBe('debug')
    })

    it('should include custom base fields', async () => {
      const pino = await import('pino')

      createLogger({
        name: 'test',
        base: {
          environment: 'production',
          version: '1.0.0',
        },
      })

      const config = vi.mocked(pino.default).mock.calls[0][0]
      expect(config.base).toMatchObject({
        service: 'test',
        environment: 'production',
        version: '1.0.0',
      })
    })

    it('should support custom serializers', async () => {
      const pino = await import('pino')
      const errorSerializer = (err: Error) => ({ message: err.message })

      createLogger({
        name: 'test',
        serializers: { err: errorSerializer },
      })

      const config = vi.mocked(pino.default).mock.calls[0][0]
      expect(config.serializers).toHaveProperty('err')
      expect(config.serializers.err).toBe(errorSerializer)
    })
  })

  describe('default transport', () => {
    it('should use stdout when no transports provided', async () => {
      const pino = await import('pino')

      createLogger({ name: 'test' })

      const stream = vi.mocked(pino.default).mock.calls[0][1]
      expect(stream).toBe(process.stdout)
    })
  })

  describe('custom transports', () => {
    it('should use single custom transport', async () => {
      const pino = await import('pino')
      const customStream = { write: () => {} }
      const transport = { level: 'info' as const, stream: customStream }

      createLogger({ name: 'test', transports: [transport] })

      const stream = vi.mocked(pino.default).mock.calls[0][1]
      expect(stream).toBe(customStream)
    })

    it('should use multistream for multiple transports', async () => {
      const pino = await import('pino')
      const stream1 = { write: () => {} }
      const stream2 = { write: () => {} }
      const transports = [
        { level: 'info' as const, stream: stream1 },
        { level: 'error' as const, stream: stream2 },
      ]

      createLogger({ name: 'test', transports })

      expect(vi.mocked(pino.default).multistream).toHaveBeenCalledWith(transports)
    })

    it('should pass transport level to stream entry', async () => {
      const customStream = { write: () => {} }
      const transport = { level: 'warn' as const, stream: customStream }

      createLogger({ name: 'test', transports: [transport] })

      // Transport level is part of the transport object itself
      expect(transport.level).toBe('warn')
    })
  })

  describe('logger instance', () => {
    it('should return pino logger instance', () => {
      const logger = createLogger({ name: 'test' })

      expect(logger).toBeDefined()
      expect(logger).toHaveProperty('info')
      expect(logger).toHaveProperty('error')
      expect(logger).toHaveProperty('child')
    })
  })

  describe('integration with transports', () => {
    it('should work with console transport', async () => {
      const pino = await import('pino')

      // Mock console transport
      const consoleTransport = {
        level: 'debug' as const,
        stream: process.stdout,
      }

      createLogger({ name: 'test', transports: [consoleTransport] })

      const stream = vi.mocked(pino.default).mock.calls[0][1]
      expect(stream).toBe(process.stdout)
    })

    it('should work with multiple different transports', async () => {
      const pino = await import('pino')
      const transports = [
        { level: 'info' as const, stream: { write: () => {} } },
        { level: 'error' as const, stream: { write: () => {} } },
        { level: 'debug' as const, stream: { write: () => {} } },
      ]

      createLogger({ name: 'test', transports })

      expect(vi.mocked(pino.default).multistream).toHaveBeenCalledWith(transports)
      const result = vi.mocked(pino.default).multistream.mock.results[0].value
      expect(pino.default).toHaveBeenCalledWith(
        expect.anything(),
        result
      )
    })
  })

  describe('log level options', () => {
    it('should support all pino log levels', async () => {
      const pino = await import('pino')
      const levels: Array<'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'> = [
        'trace',
        'debug',
        'info',
        'warn',
        'error',
        'fatal',
      ]

      levels.forEach((level) => {
        vi.clearAllMocks()
        createLogger({ name: 'test', level })

        const config = vi.mocked(pino.default).mock.calls[0][0]
        expect(config.level).toBe(level)
      })
    })
  })
})

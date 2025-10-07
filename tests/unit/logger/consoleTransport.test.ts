import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createConsoleTransport } from '../../../src/utils/logger/transports/console'

// Mock pino
vi.mock('pino', () => ({
  default: {
    transport: vi.fn((config) => ({ _mock: 'transport', config })),
  },
}))

describe('createConsoleTransport', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('basic configuration', () => {
    it('should create console transport with default options', () => {
      const transport = createConsoleTransport()

      expect(transport).toMatchObject({
        level: 'info',
        stream: process.stdout,
      })
    })

    it('should use custom log level', () => {
      const transport = createConsoleTransport({ level: 'debug' })

      expect(transport.level).toBe('debug')
    })

    it('should output to stdout when pretty is false', () => {
      const transport = createConsoleTransport({ pretty: false })

      expect(transport.stream).toBe(process.stdout)
    })
  })

  describe('pretty printing', () => {
    it('should create pino-pretty transport when pretty is true', async () => {
      const pino = await import('pino')
      const transport = createConsoleTransport({ pretty: true })

      expect(pino.default.transport).toHaveBeenCalledWith({
        target: 'pino-pretty',
        options: expect.objectContaining({
          colorize: true,
          translateTime: 'yyyy-mm-dd HH:MM:ss',
          ignore: 'pid,hostname',
        }),
      })
    })

    it('should use custom pretty options', async () => {
      const pino = await import('pino')

      createConsoleTransport({
        pretty: true,
        prettyOptions: {
          colorize: false,
          translateTime: 'HH:MM:ss',
          singleLine: true,
        },
      })

      expect(pino.default.transport).toHaveBeenCalledWith({
        target: 'pino-pretty',
        options: expect.objectContaining({
          colorize: false,
          translateTime: 'HH:MM:ss',
          singleLine: true,
        }),
      })
    })

    it('should merge custom options with defaults', async () => {
      const pino = await import('pino')

      createConsoleTransport({
        pretty: true,
        prettyOptions: {
          singleLine: true,
        },
      })

      const call = vi.mocked(pino.default.transport).mock.calls[0][0]
      expect(call.options).toMatchObject({
        colorize: true, // default
        translateTime: 'yyyy-mm-dd HH:MM:ss', // default
        ignore: 'pid,hostname', // default
        singleLine: true, // custom
      })
    })
  })

  describe('level configuration', () => {
    it('should support all pino log levels', () => {
      const levels: Array<'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'> = [
        'trace',
        'debug',
        'info',
        'warn',
        'error',
        'fatal',
      ]

      levels.forEach((level) => {
        const transport = createConsoleTransport({ level })
        expect(transport.level).toBe(level)
      })
    })
  })
})

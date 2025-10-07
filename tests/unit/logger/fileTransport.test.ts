import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createFileTransport } from '../../../src/utils/logger/transports/file'
import fs from 'fs'
import path from 'path'

// Mock pino
vi.mock('pino', () => ({
  default: {
    destination: vi.fn((config) => ({ _mock: 'destination', config })),
  },
}))

// Mock fs
vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn(),
    mkdirSync: vi.fn(),
  },
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
}))

describe('createFileTransport', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('basic configuration', () => {
    it('should create file transport with default options', async () => {
      const pino = await import('pino')
      vi.mocked(fs.existsSync).mockReturnValue(true)

      const transport = createFileTransport()

      expect(transport.level).toBe('info')
      expect(pino.default.destination).toHaveBeenCalledWith(
        expect.objectContaining({
          dest: path.join('./logs', 'app.log'),
          sync: false,
          mkdir: true,
        })
      )
    })

    it('should use custom log level', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)

      const transport = createFileTransport({ level: 'error' })

      expect(transport.level).toBe('error')
    })

    it('should use custom directory and filename', async () => {
      const pino = await import('pino')
      vi.mocked(fs.existsSync).mockReturnValue(true)

      createFileTransport({
        dir: '/var/logs',
        fileName: 'service.log',
      })

      expect(pino.default.destination).toHaveBeenCalledWith(
        expect.objectContaining({
          dest: '/var/logs/service.log',
        })
      )
    })

    it('should support sync mode', async () => {
      const pino = await import('pino')
      vi.mocked(fs.existsSync).mockReturnValue(true)

      createFileTransport({ sync: true })

      expect(pino.default.destination).toHaveBeenCalledWith(
        expect.objectContaining({
          sync: true,
        })
      )
    })
  })

  describe('directory creation', () => {
    it('should create directory if it does not exist', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false)

      createFileTransport({ dir: './custom-logs' })

      expect(fs.mkdirSync).toHaveBeenCalledWith('./custom-logs', { recursive: true })
    })

    it('should not create directory if it exists', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)

      createFileTransport({ dir: './existing-logs' })

      expect(fs.mkdirSync).not.toHaveBeenCalled()
    })

    it('should skip directory creation when mkdir is false', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false)

      createFileTransport({ mkdir: false })

      expect(fs.mkdirSync).not.toHaveBeenCalled()
    })

    it('should throw error if directory creation fails', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false)
      vi.mocked(fs.mkdirSync).mockImplementation(() => {
        throw new Error('Permission denied')
      })

      expect(() => createFileTransport({ dir: '/forbidden' })).toThrow(
        /Failed to create log directory/
      )
      expect(() => createFileTransport({ dir: '/forbidden' })).toThrow(/Permission denied/)
    })
  })

  describe('path resolution', () => {
    it('should correctly join directory and filename', async () => {
      const pino = await import('pino')
      vi.mocked(fs.existsSync).mockReturnValue(true)

      createFileTransport({
        dir: '/var/log/app',
        fileName: 'server.log',
      })

      const call = vi.mocked(pino.default.destination).mock.calls[0][0]
      expect(call.dest).toBe(path.join('/var/log/app', 'server.log'))
    })

    it('should handle relative paths', async () => {
      const pino = await import('pino')
      vi.mocked(fs.existsSync).mockReturnValue(true)

      createFileTransport({
        dir: '../logs',
        fileName: 'app.log',
      })

      const call = vi.mocked(pino.default.destination).mock.calls[0][0]
      expect(call.dest).toBe(path.join('../logs', 'app.log'))
    })
  })

  describe('level configuration', () => {
    it('should support all pino log levels', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)

      const levels: Array<'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'> = [
        'trace',
        'debug',
        'info',
        'warn',
        'error',
        'fatal',
      ]

      levels.forEach((level) => {
        const transport = createFileTransport({ level })
        expect(transport.level).toBe(level)
      })
    })
  })
})

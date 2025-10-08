import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('graceful shutdown', () => {
  let processOnSpy: any
  let consoleLogSpy: any
  let consoleErrorSpy: any
  let processExitSpy: any

  beforeEach(() => {
    vi.clearAllMocks()
    processOnSpy = vi.spyOn(process, 'on').mockImplementation(() => process as any)
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never)
  })

  afterEach(() => {
    processOnSpy.mockRestore()
    consoleLogSpy.mockRestore()
    consoleErrorSpy.mockRestore()
    processExitSpy.mockRestore()
  })

  describe('setupGracefulShutdown', () => {
    it('should register SIGTERM handler', async () => {
      const { setupGracefulShutdown } = await import('../../../../src/utils/otel/utils/gracefulShutdown')

      const mockSDK = {
        shutdown: vi.fn().mockResolvedValue(undefined),
      }

      setupGracefulShutdown(mockSDK as any)

      expect(processOnSpy).toHaveBeenCalledWith('SIGTERM', expect.any(Function))
    })

    it('should register SIGINT handler', async () => {
      const { setupGracefulShutdown } = await import('../../../../src/utils/otel/utils/gracefulShutdown')

      const mockSDK = {
        shutdown: vi.fn().mockResolvedValue(undefined),
      }

      setupGracefulShutdown(mockSDK as any)

      expect(processOnSpy).toHaveBeenCalledWith('SIGINT', expect.any(Function))
    })

    it('should call SDK shutdown when SIGTERM received', async () => {
      const { setupGracefulShutdown } = await import('../../../../src/utils/otel/utils/gracefulShutdown')

      const mockSDK = {
        shutdown: vi.fn().mockResolvedValue(undefined),
      }

      setupGracefulShutdown(mockSDK as any)

      // Get the SIGTERM handler and call it
      const sigtermHandler = processOnSpy.mock.calls.find((call: any) => call[0] === 'SIGTERM')[1]
      await sigtermHandler()

      expect(mockSDK.shutdown).toHaveBeenCalled()
    })

    it('should call SDK shutdown when SIGINT received', async () => {
      const { setupGracefulShutdown } = await import('../../../../src/utils/otel/utils/gracefulShutdown')

      const mockSDK = {
        shutdown: vi.fn().mockResolvedValue(undefined),
      }

      setupGracefulShutdown(mockSDK as any)

      // Get the SIGINT handler and call it
      const sigintHandler = processOnSpy.mock.calls.find((call: any) => call[0] === 'SIGINT')[1]
      await sigintHandler()

      expect(mockSDK.shutdown).toHaveBeenCalled()
    })

    it('should log shutdown message with signal name on SIGTERM', async () => {
      const { setupGracefulShutdown } = await import('../../../../src/utils/otel/utils/gracefulShutdown')

      const mockSDK = {
        shutdown: vi.fn().mockResolvedValue(undefined),
      }

      setupGracefulShutdown(mockSDK as any)

      const sigtermHandler = processOnSpy.mock.calls.find((call: any) => call[0] === 'SIGTERM')[1]
      await sigtermHandler()

      expect(consoleLogSpy).toHaveBeenCalledWith('\nSIGTERM received. Shutting down gracefully...')
    })

    it('should log shutdown message with signal name on SIGINT', async () => {
      const { setupGracefulShutdown } = await import('../../../../src/utils/otel/utils/gracefulShutdown')

      const mockSDK = {
        shutdown: vi.fn().mockResolvedValue(undefined),
      }

      setupGracefulShutdown(mockSDK as any)

      const sigintHandler = processOnSpy.mock.calls.find((call: any) => call[0] === 'SIGINT')[1]
      await sigintHandler()

      expect(consoleLogSpy).toHaveBeenCalledWith('\nSIGINT received. Shutting down gracefully...')
    })

    it('should log success message after successful shutdown', async () => {
      const { setupGracefulShutdown } = await import('../../../../src/utils/otel/utils/gracefulShutdown')

      const mockSDK = {
        shutdown: vi.fn().mockResolvedValue(undefined),
      }

      setupGracefulShutdown(mockSDK as any)

      const sigtermHandler = processOnSpy.mock.calls.find((call: any) => call[0] === 'SIGTERM')[1]
      await sigtermHandler()

      expect(consoleLogSpy).toHaveBeenCalledWith('OpenTelemetry SDK shut down successfully')
    })

    it('should exit with code 0 after successful shutdown', async () => {
      const { setupGracefulShutdown } = await import('../../../../src/utils/otel/utils/gracefulShutdown')

      const mockSDK = {
        shutdown: vi.fn().mockResolvedValue(undefined),
      }

      setupGracefulShutdown(mockSDK as any)

      const sigtermHandler = processOnSpy.mock.calls.find((call: any) => call[0] === 'SIGTERM')[1]
      await sigtermHandler()

      expect(processExitSpy).toHaveBeenCalledWith(0)
    })

    it('should log error message if shutdown fails', async () => {
      const { setupGracefulShutdown } = await import('../../../../src/utils/otel/utils/gracefulShutdown')

      const shutdownError = new Error('Shutdown failed')
      const mockSDK = {
        shutdown: vi.fn().mockRejectedValue(shutdownError),
      }

      setupGracefulShutdown(mockSDK as any)

      const sigtermHandler = processOnSpy.mock.calls.find((call: any) => call[0] === 'SIGTERM')[1]
      await sigtermHandler()

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error during shutdown:', shutdownError)
    })

    it('should exit with code 1 if shutdown fails', async () => {
      const { setupGracefulShutdown } = await import('../../../../src/utils/otel/utils/gracefulShutdown')

      const mockSDK = {
        shutdown: vi.fn().mockRejectedValue(new Error('Shutdown failed')),
      }

      setupGracefulShutdown(mockSDK as any)

      const sigtermHandler = processOnSpy.mock.calls.find((call: any) => call[0] === 'SIGTERM')[1]
      await sigtermHandler()

      expect(processExitSpy).toHaveBeenCalledWith(1)
    })

    it('should handle both SIGTERM and SIGINT independently', async () => {
      const { setupGracefulShutdown } = await import('../../../../src/utils/otel/utils/gracefulShutdown')

      const mockSDK = {
        shutdown: vi.fn().mockResolvedValue(undefined),
      }

      setupGracefulShutdown(mockSDK as any)

      // Both handlers should be registered
      const calls = processOnSpy.mock.calls
      const sigtermCall = calls.find((call: any) => call[0] === 'SIGTERM')
      const sigintCall = calls.find((call: any) => call[0] === 'SIGINT')

      expect(sigtermCall).toBeDefined()
      expect(sigintCall).toBeDefined()
      expect(sigtermCall[1]).not.toBe(sigintCall[1]) // Different handler instances
    })
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock ConsoleSpanExporter
const mockConsoleSpanExporter = vi.fn()

vi.mock('@opentelemetry/sdk-trace-base', () => ({
  ConsoleSpanExporter: mockConsoleSpanExporter,
}))

describe('console trace exporter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createConsoleTraceExporter', () => {
    it('should create ConsoleSpanExporter instance', async () => {
      const { createConsoleTraceExporter } = await import('../../../../../src/utils/otel/exporters/tracing/console')

      createConsoleTraceExporter()

      expect(mockConsoleSpanExporter).toHaveBeenCalled()
      expect(mockConsoleSpanExporter).toHaveBeenCalledWith()
    })

    it('should return exporter instance', async () => {
      const mockExporter = { export: vi.fn(), shutdown: vi.fn() }
      mockConsoleSpanExporter.mockReturnValue(mockExporter)

      const { createConsoleTraceExporter } = await import('../../../../../src/utils/otel/exporters/tracing/console')

      const result = createConsoleTraceExporter()

      expect(result).toBe(mockExporter)
    })

    it('should create new instance on each call', async () => {
      const { createConsoleTraceExporter } = await import('../../../../../src/utils/otel/exporters/tracing/console')

      createConsoleTraceExporter()
      createConsoleTraceExporter()
      createConsoleTraceExporter()

      expect(mockConsoleSpanExporter).toHaveBeenCalledTimes(3)
    })
  })
})

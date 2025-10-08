import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Store original environment
const originalEnv = process.env

// Mock JaegerExporter
const mockJaegerExporter = vi.fn()

vi.mock('@opentelemetry/exporter-jaeger', () => ({
  JaegerExporter: mockJaegerExporter,
}))

describe('Jaeger trace exporter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
    delete process.env.JAEGER_ENDPOINT
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('createJaegerTraceExporter', () => {
    it('should create JaegerExporter with default endpoint', async () => {
      const { createJaegerTraceExporter } = await import('../../../../../src/utils/otel/exporters/tracing/jaeger')

      createJaegerTraceExporter()

      expect(mockJaegerExporter).toHaveBeenCalledWith({
        endpoint: 'http://localhost:14268/api/traces',
      })
    })

    it('should use JAEGER_ENDPOINT when set', async () => {
      process.env.JAEGER_ENDPOINT = 'http://jaeger.production:14268/api/traces'

      const { createJaegerTraceExporter } = await import('../../../../../src/utils/otel/exporters/tracing/jaeger')

      createJaegerTraceExporter()

      expect(mockJaegerExporter).toHaveBeenCalledWith({
        endpoint: 'http://jaeger.production:14268/api/traces',
      })
    })

    it('should support custom Jaeger endpoints', async () => {
      process.env.JAEGER_ENDPOINT = 'https://jaeger.example.com:14268/api/traces'

      const { createJaegerTraceExporter } = await import('../../../../../src/utils/otel/exporters/tracing/jaeger')

      createJaegerTraceExporter()

      expect(mockJaegerExporter).toHaveBeenCalledWith({
        endpoint: 'https://jaeger.example.com:14268/api/traces',
      })
    })

    it('should handle different port configurations', async () => {
      process.env.JAEGER_ENDPOINT = 'http://localhost:9000/api/traces'

      const { createJaegerTraceExporter } = await import('../../../../../src/utils/otel/exporters/tracing/jaeger')

      createJaegerTraceExporter()

      expect(mockJaegerExporter).toHaveBeenCalledWith({
        endpoint: 'http://localhost:9000/api/traces',
      })
    })

    it('should return exporter instance', async () => {
      const mockExporter = { export: vi.fn(), shutdown: vi.fn() }
      mockJaegerExporter.mockReturnValue(mockExporter)

      const { createJaegerTraceExporter } = await import('../../../../../src/utils/otel/exporters/tracing/jaeger')

      const result = createJaegerTraceExporter()

      expect(result).toBe(mockExporter)
    })

    it('should create new instance on each call', async () => {
      const { createJaegerTraceExporter } = await import('../../../../../src/utils/otel/exporters/tracing/jaeger')

      createJaegerTraceExporter()
      createJaegerTraceExporter()

      expect(mockJaegerExporter).toHaveBeenCalledTimes(2)
    })
  })
})

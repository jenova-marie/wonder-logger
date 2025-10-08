import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Store original environment
const originalEnv = process.env

// Mock OTLPTraceExporter
const mockOTLPTraceExporter = vi.fn()

vi.mock('@opentelemetry/exporter-trace-otlp-http', () => ({
  OTLPTraceExporter: mockOTLPTraceExporter,
}))

describe('OTLP trace exporter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
    delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT
    delete process.env.OTEL_EXPORTER_OTLP_HEADERS
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('createOtlpTraceExporter', () => {
    it('should create OTLPTraceExporter with default endpoint', async () => {
      const { createOtlpTraceExporter } = await import('../../../../../src/utils/otel/exporters/tracing/otlp')

      createOtlpTraceExporter()

      expect(mockOTLPTraceExporter).toHaveBeenCalledWith({
        headers: {},
      })
    })

    it('should use OTEL_EXPORTER_OTLP_ENDPOINT when set', async () => {
      process.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'https://api.honeycomb.io/v1/traces'

      const { createOtlpTraceExporter } = await import('../../../../../src/utils/otel/exporters/tracing/otlp')

      createOtlpTraceExporter()

      expect(mockOTLPTraceExporter).toHaveBeenCalledWith({
        headers: {},
      })
    })

    it('should parse OTEL_EXPORTER_OTLP_HEADERS JSON', async () => {
      process.env.OTEL_EXPORTER_OTLP_HEADERS = '{"Authorization":"Bearer token123","X-Custom":"value"}'

      const { createOtlpTraceExporter } = await import('../../../../../src/utils/otel/exporters/tracing/otlp')

      createOtlpTraceExporter()

      expect(mockOTLPTraceExporter).toHaveBeenCalledWith({
        headers: {
          Authorization: 'Bearer token123',
          'X-Custom': 'value',
        },
      })
    })

    it('should handle invalid OTEL_EXPORTER_OTLP_HEADERS JSON gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      process.env.OTEL_EXPORTER_OTLP_HEADERS = 'not-valid-json'

      const { createOtlpTraceExporter } = await import('../../../../../src/utils/otel/exporters/tracing/otlp')

      createOtlpTraceExporter()

      expect(consoleSpy).toHaveBeenCalledWith(
        'Invalid OTEL_EXPORTER_OTLP_HEADERS JSON:',
        'not-valid-json'
      )
      expect(mockOTLPTraceExporter).toHaveBeenCalledWith({
        headers: {},
      })

      consoleSpy.mockRestore()
    })

    it('should handle empty OTEL_EXPORTER_OTLP_HEADERS', async () => {
      process.env.OTEL_EXPORTER_OTLP_HEADERS = ''

      const { createOtlpTraceExporter } = await import('../../../../../src/utils/otel/exporters/tracing/otlp')

      createOtlpTraceExporter()

      expect(mockOTLPTraceExporter).toHaveBeenCalledWith({
        headers: {},
      })
    })

    it('should handle complex header objects', async () => {
      process.env.OTEL_EXPORTER_OTLP_HEADERS = JSON.stringify({
        'x-api-key': 'secret-key',
        'x-tenant-id': 'tenant-123',
        Authorization: 'Bearer complex-token',
      })

      const { createOtlpTraceExporter } = await import('../../../../../src/utils/otel/exporters/tracing/otlp')

      createOtlpTraceExporter()

      expect(mockOTLPTraceExporter).toHaveBeenCalledWith({
        headers: {
          'x-api-key': 'secret-key',
          'x-tenant-id': 'tenant-123',
          Authorization: 'Bearer complex-token',
        },
      })
    })

    it('should combine custom endpoint with custom headers', async () => {
      process.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'https://trace.example.com/v1/traces'
      process.env.OTEL_EXPORTER_OTLP_HEADERS = '{"Authorization":"Bearer test"}'

      const { createOtlpTraceExporter } = await import('../../../../../src/utils/otel/exporters/tracing/otlp')

      createOtlpTraceExporter()

      expect(mockOTLPTraceExporter).toHaveBeenCalledWith({
        headers: {
          Authorization: 'Bearer test',
        },
      })
    })

    it('should return exporter instance', async () => {
      const mockExporter = { export: vi.fn(), shutdown: vi.fn() }
      mockOTLPTraceExporter.mockReturnValue(mockExporter)

      const { createOtlpTraceExporter } = await import('../../../../../src/utils/otel/exporters/tracing/otlp')

      const result = createOtlpTraceExporter()

      expect(result).toBe(mockExporter)
    })
  })
})

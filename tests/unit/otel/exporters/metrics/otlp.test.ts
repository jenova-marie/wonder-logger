import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Store original environment
const originalEnv = process.env

// Mock OTLPMetricExporter
const mockOTLPMetricExporter = vi.fn()

vi.mock('@opentelemetry/exporter-metrics-otlp-http', () => ({
  OTLPMetricExporter: mockOTLPMetricExporter,
}))

describe('OTLP metrics exporter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
    delete process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('createOtlpMetricsExporter', () => {
    it('should create OTLPMetricExporter with default endpoint', async () => {
      const { createOtlpMetricsExporter } = await import('../../../../../src/utils/otel/exporters/metrics/otlp')

      createOtlpMetricsExporter()

      expect(mockOTLPMetricExporter).toHaveBeenCalledWith({
        url: 'http://localhost:4318/v1/metrics',
      })
    })

    it('should use OTEL_EXPORTER_OTLP_METRICS_ENDPOINT when set', async () => {
      process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT = 'https://metrics.example.com/v1/metrics'

      const { createOtlpMetricsExporter } = await import('../../../../../src/utils/otel/exporters/metrics/otlp')

      createOtlpMetricsExporter()

      expect(mockOTLPMetricExporter).toHaveBeenCalledWith({
        url: 'https://metrics.example.com/v1/metrics',
      })
    })

    it('should support various OTLP endpoints', async () => {
      process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT = 'https://tempo.rso:4318/v1/metrics'

      const { createOtlpMetricsExporter } = await import('../../../../../src/utils/otel/exporters/metrics/otlp')

      createOtlpMetricsExporter()

      expect(mockOTLPMetricExporter).toHaveBeenCalledWith({
        url: 'https://tempo.rso:4318/v1/metrics',
      })
    })

    it('should handle different port configurations', async () => {
      process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT = 'https://collector:9000/v1/metrics'

      const { createOtlpMetricsExporter } = await import('../../../../../src/utils/otel/exporters/metrics/otlp')

      createOtlpMetricsExporter()

      expect(mockOTLPMetricExporter).toHaveBeenCalledWith({
        url: 'https://collector:9000/v1/metrics',
      })
    })

    it('should return exporter instance', async () => {
      const mockExporter = { export: vi.fn(), shutdown: vi.fn() }
      mockOTLPMetricExporter.mockReturnValue(mockExporter)

      const { createOtlpMetricsExporter } = await import('../../../../../src/utils/otel/exporters/metrics/otlp')

      const result = createOtlpMetricsExporter()

      expect(result).toBe(mockExporter)
    })

    it('should create new instance on each call', async () => {
      const { createOtlpMetricsExporter } = await import('../../../../../src/utils/otel/exporters/metrics/otlp')

      createOtlpMetricsExporter()
      createOtlpMetricsExporter()

      expect(mockOTLPMetricExporter).toHaveBeenCalledTimes(2)
    })
  })
})

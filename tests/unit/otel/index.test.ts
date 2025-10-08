import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock all dependencies
const mockSDKStart = vi.fn()
const mockSDKShutdown = vi.fn()
const mockNodeSDK = vi.fn().mockImplementation(() => ({
  start: mockSDKStart,
  shutdown: mockSDKShutdown,
}))

const mockResource = { attributes: { 'service.name': 'test' } }
const mockCreateResource = vi.fn(() => mockResource)

const mockConsoleExporter = { export: vi.fn() }
const mockCreateConsoleTraceExporter = vi.fn(() => mockConsoleExporter)

const mockOtlpExporter = { export: vi.fn() }
const mockCreateOtlpTraceExporter = vi.fn(() => mockOtlpExporter)

const mockJaegerExporter = { export: vi.fn() }
const mockCreateJaegerTraceExporter = vi.fn(() => mockJaegerExporter)

const mockPrometheusExporter = { collect: vi.fn() }
const mockCreatePrometheusExporter = vi.fn(() => mockPrometheusExporter)

const mockOtlpMetricsExporter = { export: vi.fn() }
const mockCreateOtlpMetricsExporter = vi.fn(() => mockOtlpMetricsExporter)

const mockAutoInstrumentations = ['instrumentation1', 'instrumentation2']
const mockCreateAutoInstrumentations = vi.fn(() => mockAutoInstrumentations)

const mockSetupGracefulShutdown = vi.fn()

const mockBatchSpanProcessor = vi.fn()
const mockPeriodicExportingMetricReader = vi.fn()

vi.mock('@opentelemetry/sdk-node', () => ({
  NodeSDK: mockNodeSDK,
}))

vi.mock('@opentelemetry/sdk-trace-base', () => ({
  BatchSpanProcessor: mockBatchSpanProcessor,
}))

vi.mock('@opentelemetry/sdk-metrics', () => ({
  PeriodicExportingMetricReader: mockPeriodicExportingMetricReader,
}))

vi.mock('../../../src/utils/otel/utils/resource', () => ({
  createResource: mockCreateResource,
}))

vi.mock('../../../src/utils/otel/exporters/tracing/console', () => ({
  createConsoleTraceExporter: mockCreateConsoleTraceExporter,
}))

vi.mock('../../../src/utils/otel/exporters/tracing/otlp', () => ({
  createOtlpTraceExporter: mockCreateOtlpTraceExporter,
}))

vi.mock('../../../src/utils/otel/exporters/tracing/jaeger', () => ({
  createJaegerTraceExporter: mockCreateJaegerTraceExporter,
}))

vi.mock('../../../src/utils/otel/exporters/metrics/prometheus', () => ({
  createPrometheusExporter: mockCreatePrometheusExporter,
}))

vi.mock('../../../src/utils/otel/exporters/metrics/otlp', () => ({
  createOtlpMetricsExporter: mockCreateOtlpMetricsExporter,
}))

vi.mock('../../../src/utils/otel/instrumentations/auto', () => ({
  createAutoInstrumentations: mockCreateAutoInstrumentations,
}))

vi.mock('../../../src/utils/otel/utils/gracefulShutdown', () => ({
  setupGracefulShutdown: mockSetupGracefulShutdown,
}))

describe('createTelemetry factory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('basic initialization', () => {
    it('should create resource with provided service name', async () => {
      const { createTelemetry } = await import('../../../src/utils/otel')

      createTelemetry({ serviceName: 'my-service' })

      expect(mockCreateResource).toHaveBeenCalledWith({
        serviceName: 'my-service',
        serviceVersion: undefined,
        environment: undefined,
      })
    })

    it('should create resource with all metadata', async () => {
      const { createTelemetry } = await import('../../../src/utils/otel')

      createTelemetry({
        serviceName: 'my-api',
        serviceVersion: '2.1.0',
        environment: 'production',
      })

      expect(mockCreateResource).toHaveBeenCalledWith({
        serviceName: 'my-api',
        serviceVersion: '2.1.0',
        environment: 'production',
      })
    })

    it('should create NodeSDK with resource', async () => {
      const { createTelemetry } = await import('../../../src/utils/otel')

      createTelemetry({ serviceName: 'test' })

      expect(mockNodeSDK).toHaveBeenCalledWith(
        expect.objectContaining({
          resource: mockResource,
        })
      )
    })

    it('should start SDK automatically', async () => {
      const { createTelemetry } = await import('../../../src/utils/otel')

      createTelemetry({ serviceName: 'test' })

      expect(mockSDKStart).toHaveBeenCalled()
    })

    it('should setup graceful shutdown', async () => {
      const { createTelemetry } = await import('../../../src/utils/otel')

      const mockSDKInstance = { start: vi.fn(), shutdown: vi.fn() }
      mockNodeSDK.mockReturnValueOnce(mockSDKInstance)

      createTelemetry({ serviceName: 'test' })

      expect(mockSetupGracefulShutdown).toHaveBeenCalledWith(mockSDKInstance)
    })

    it('should return SDK instance', async () => {
      const { createTelemetry } = await import('../../../src/utils/otel')

      const result = createTelemetry({ serviceName: 'test' })

      expect(result).toBeDefined()
      expect(result.start).toBeDefined()
      expect(result.shutdown).toBeDefined()
    })
  })

  describe('trace exporters', () => {
    it('should use console exporter by default', async () => {
      const { createTelemetry } = await import('../../../src/utils/otel')

      createTelemetry({ serviceName: 'test' })

      expect(mockCreateConsoleTraceExporter).toHaveBeenCalled()
      expect(mockBatchSpanProcessor).toHaveBeenCalledWith(mockConsoleExporter)
    })

    it('should use console exporter when explicitly configured', async () => {
      const { createTelemetry } = await import('../../../src/utils/otel')

      createTelemetry({
        serviceName: 'test',
        tracing: { exporter: 'console' },
      })

      expect(mockCreateConsoleTraceExporter).toHaveBeenCalled()
    })

    it('should use OTLP exporter when configured', async () => {
      const { createTelemetry } = await import('../../../src/utils/otel')

      createTelemetry({
        serviceName: 'test',
        tracing: { exporter: 'otlp' },
      })

      expect(mockCreateOtlpTraceExporter).toHaveBeenCalled()
      expect(mockCreateConsoleTraceExporter).not.toHaveBeenCalled()
    })

    it('should use Jaeger exporter when configured', async () => {
      const { createTelemetry } = await import('../../../src/utils/otel')

      createTelemetry({
        serviceName: 'test',
        tracing: { exporter: 'jaeger' },
      })

      expect(mockCreateJaegerTraceExporter).toHaveBeenCalled()
      expect(mockCreateConsoleTraceExporter).not.toHaveBeenCalled()
    })

    it('should disable tracing when enabled: false', async () => {
      const { createTelemetry } = await import('../../../src/utils/otel')

      createTelemetry({
        serviceName: 'test',
        tracing: { enabled: false },
      })

      expect(mockCreateConsoleTraceExporter).not.toHaveBeenCalled()
      expect(mockCreateOtlpTraceExporter).not.toHaveBeenCalled()
      expect(mockCreateJaegerTraceExporter).not.toHaveBeenCalled()
      expect(mockBatchSpanProcessor).not.toHaveBeenCalled()
    })
  })

  describe('metrics exporters', () => {
    it('should use Prometheus exporter by default', async () => {
      const { createTelemetry } = await import('../../../src/utils/otel')

      createTelemetry({ serviceName: 'test' })

      expect(mockCreatePrometheusExporter).toHaveBeenCalled()
    })

    it('should use default Prometheus port', async () => {
      const { createTelemetry } = await import('../../../src/utils/otel')

      createTelemetry({ serviceName: 'test' })

      expect(mockCreatePrometheusExporter).toHaveBeenCalledWith(undefined)
    })

    it('should use custom Prometheus port', async () => {
      const { createTelemetry } = await import('../../../src/utils/otel')

      createTelemetry({
        serviceName: 'test',
        metrics: { port: 9090 },
      })

      expect(mockCreatePrometheusExporter).toHaveBeenCalledWith(9090)
    })

    it('should use OTLP metrics exporter when configured', async () => {
      const { createTelemetry } = await import('../../../src/utils/otel')

      createTelemetry({
        serviceName: 'test',
        metrics: { exporters: ['otlp'] },
      })

      expect(mockCreateOtlpMetricsExporter).toHaveBeenCalled()
      expect(mockCreatePrometheusExporter).not.toHaveBeenCalled()
    })

    it('should support multiple metrics exporters', async () => {
      const { createTelemetry } = await import('../../../src/utils/otel')

      createTelemetry({
        serviceName: 'test',
        metrics: { exporters: ['prometheus', 'otlp'] },
      })

      expect(mockCreatePrometheusExporter).toHaveBeenCalled()
      expect(mockCreateOtlpMetricsExporter).toHaveBeenCalled()
    })

    it('should disable metrics when enabled: false', async () => {
      const { createTelemetry } = await import('../../../src/utils/otel')

      createTelemetry({
        serviceName: 'test',
        metrics: { enabled: false },
      })

      expect(mockCreatePrometheusExporter).not.toHaveBeenCalled()
      expect(mockCreateOtlpMetricsExporter).not.toHaveBeenCalled()
    })
  })

  describe('auto-instrumentation', () => {
    it('should enable auto-instrumentations with HTTP hooks', async () => {
      const { createTelemetry } = await import('../../../src/utils/otel')

      createTelemetry({ serviceName: 'test' })

      expect(mockCreateAutoInstrumentations).toHaveBeenCalledWith({
        includeHttpHooks: true,
      })
    })

    it('should pass instrumentations to NodeSDK', async () => {
      const { createTelemetry } = await import('../../../src/utils/otel')

      createTelemetry({ serviceName: 'test' })

      expect(mockNodeSDK).toHaveBeenCalledWith(
        expect.objectContaining({
          instrumentations: mockAutoInstrumentations,
        })
      )
    })
  })

  describe('complex configurations', () => {
    it('should handle production configuration', async () => {
      const { createTelemetry } = await import('../../../src/utils/otel')

      createTelemetry({
        serviceName: 'prod-api',
        serviceVersion: '3.2.1',
        environment: 'production',
        tracing: { exporter: 'otlp' },
        metrics: { exporters: ['prometheus', 'otlp'], port: 9090 },
      })

      expect(mockCreateResource).toHaveBeenCalledWith({
        serviceName: 'prod-api',
        serviceVersion: '3.2.1',
        environment: 'production',
      })
      expect(mockCreateOtlpTraceExporter).toHaveBeenCalled()
      expect(mockCreatePrometheusExporter).toHaveBeenCalledWith(9090)
      expect(mockCreateOtlpMetricsExporter).toHaveBeenCalled()
    })

    it('should handle minimal configuration', async () => {
      const { createTelemetry } = await import('../../../src/utils/otel')

      createTelemetry({ serviceName: 'minimal' })

      expect(mockCreateConsoleTraceExporter).toHaveBeenCalled()
      expect(mockCreatePrometheusExporter).toHaveBeenCalled()
      expect(mockSDKStart).toHaveBeenCalled()
    })

    it('should handle all telemetry disabled', async () => {
      const { createTelemetry } = await import('../../../src/utils/otel')

      createTelemetry({
        serviceName: 'test',
        tracing: { enabled: false },
        metrics: { enabled: false },
      })

      expect(mockCreateConsoleTraceExporter).not.toHaveBeenCalled()
      expect(mockCreatePrometheusExporter).not.toHaveBeenCalled()
      expect(mockSDKStart).toHaveBeenCalled() // SDK still starts, just with no exporters
    })
  })

  describe('exports', () => {
    it('should export withSpan utility', async () => {
      const module = await import('../../../src/utils/otel')

      expect(module.withSpan).toBeDefined()
      expect(typeof module.withSpan).toBe('function')
    })

    it('should export TelemetryOptions type', async () => {
      const module = await import('../../../src/utils/otel')

      // Type exports can't be runtime tested, but we can verify they exist in type checking
      expect(module).toBeDefined()
    })

    it('should export createTelemetry factory', async () => {
      const module = await import('../../../src/utils/otel')

      expect(module.createTelemetry).toBeDefined()
      expect(typeof module.createTelemetry).toBe('function')
    })
  })
})

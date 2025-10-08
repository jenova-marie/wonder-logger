import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Store original environment
const originalEnv = process.env

// Create comprehensive mocks for OpenTelemetry
const mockSDKStart = vi.fn()
const mockSDKShutdown = vi.fn()
const mockNodeSDK = vi.fn().mockImplementation(() => ({
  start: mockSDKStart,
  shutdown: mockSDKShutdown,
}))

const mockResourceFromAttributes = vi.fn((attrs) => ({ attributes: attrs }))
const mockConsoleSpanExporter = vi.fn()
const mockOTLPTraceExporter = vi.fn()
const mockJaegerExporter = vi.fn()
const mockPrometheusExporter = vi.fn()
const mockOTLPMetricExporter = vi.fn()
const mockBatchSpanProcessor = vi.fn()
const mockPeriodicExportingMetricReader = vi.fn()
const mockGetNodeAutoInstrumentations = vi.fn(() => [])
const mockHttpInstrumentation = vi.fn()

// Mock all required modules
vi.mock('@opentelemetry/sdk-node', () => ({
  NodeSDK: mockNodeSDK,
}))

vi.mock('@opentelemetry/resources', () => ({
  resourceFromAttributes: mockResourceFromAttributes,
}))

vi.mock('@opentelemetry/semantic-conventions', () => ({
  SEMRESATTRS_SERVICE_NAME: 'service.name',
  SEMRESATTRS_SERVICE_VERSION: 'service.version',
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT: 'deployment.environment',
}))

vi.mock('@opentelemetry/sdk-trace-base', () => ({
  BatchSpanProcessor: mockBatchSpanProcessor,
  ConsoleSpanExporter: mockConsoleSpanExporter,
}))

vi.mock('@opentelemetry/exporter-trace-otlp-http', () => ({
  OTLPTraceExporter: mockOTLPTraceExporter,
}))

vi.mock('@opentelemetry/exporter-jaeger', () => ({
  JaegerExporter: mockJaegerExporter,
}))

vi.mock('@opentelemetry/exporter-prometheus', () => ({
  PrometheusExporter: mockPrometheusExporter,
}))

vi.mock('@opentelemetry/exporter-metrics-otlp-http', () => ({
  OTLPMetricExporter: mockOTLPMetricExporter,
}))

vi.mock('@opentelemetry/sdk-metrics', () => ({
  PeriodicExportingMetricReader: mockPeriodicExportingMetricReader,
}))

vi.mock('@opentelemetry/auto-instrumentations-node', () => ({
  getNodeAutoInstrumentations: mockGetNodeAutoInstrumentations,
}))

vi.mock('@opentelemetry/instrumentation-http', () => ({
  HttpInstrumentation: mockHttpInstrumentation,
}))

describe('otel modular architecture', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
    delete process.env.NODE_ENV
    delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT
    delete process.env.OTEL_EXPORTER_OTLP_HEADERS
    delete process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT
    delete process.env.JAEGER_ENDPOINT
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('createTelemetry factory', () => {
    it('should create SDK with default configuration', async () => {
      const { createTelemetry } = await import('../../src/utils/otel')

      const sdk = createTelemetry({
        serviceName: 'test-service',
      })

      expect(sdk).toBeDefined()
      expect(mockResourceFromAttributes).toHaveBeenCalledWith({
        'service.name': 'test-service',
        'service.version': '0.0.0',
        'deployment.environment': 'development',
      })
      expect(mockNodeSDK).toHaveBeenCalled()
      expect(mockSDKStart).toHaveBeenCalled()
    })

    it('should create SDK with custom service metadata', async () => {
      const { createTelemetry } = await import('../../src/utils/otel')

      createTelemetry({
        serviceName: 'my-api',
        serviceVersion: '2.1.0',
        environment: 'production',
      })

      expect(mockResourceFromAttributes).toHaveBeenCalledWith({
        'service.name': 'my-api',
        'service.version': '2.1.0',
        'deployment.environment': 'production',
      })
    })

    it('should use NODE_ENV when environment not specified', async () => {
      process.env.NODE_ENV = 'staging'

      const { createTelemetry } = await import('../../src/utils/otel')

      createTelemetry({
        serviceName: 'test-service',
      })

      expect(mockResourceFromAttributes).toHaveBeenCalledWith({
        'service.name': 'test-service',
        'service.version': '0.0.0',
        'deployment.environment': 'staging',
      })
    })
  })

  describe('trace exporters', () => {
    it('should use console exporter by default', async () => {
      const { createTelemetry } = await import('../../src/utils/otel')

      createTelemetry({
        serviceName: 'test-service',
      })

      expect(mockConsoleSpanExporter).toHaveBeenCalled()
      expect(mockBatchSpanProcessor).toHaveBeenCalled()
    })

    it('should use OTLP trace exporter when configured', async () => {
      const { createTelemetry } = await import('../../src/utils/otel')

      createTelemetry({
        serviceName: 'test-service',
        tracing: {
          exporter: 'otlp',
        },
      })

      expect(mockOTLPTraceExporter).toHaveBeenCalled()
      expect(mockConsoleSpanExporter).not.toHaveBeenCalled()
    })

    it('should use Jaeger exporter when configured', async () => {
      const { createTelemetry } = await import('../../src/utils/otel')

      createTelemetry({
        serviceName: 'test-service',
        tracing: {
          exporter: 'jaeger',
        },
      })

      expect(mockJaegerExporter).toHaveBeenCalled()
      expect(mockConsoleSpanExporter).not.toHaveBeenCalled()
    })

    it('should disable tracing when enabled: false', async () => {
      const { createTelemetry } = await import('../../src/utils/otel')

      createTelemetry({
        serviceName: 'test-service',
        tracing: {
          enabled: false,
        },
      })

      expect(mockConsoleSpanExporter).not.toHaveBeenCalled()
      expect(mockOTLPTraceExporter).not.toHaveBeenCalled()
      expect(mockJaegerExporter).not.toHaveBeenCalled()
    })
  })

  describe('metrics exporters', () => {
    it('should use Prometheus exporter by default', async () => {
      const { createTelemetry } = await import('../../src/utils/otel')

      createTelemetry({
        serviceName: 'test-service',
      })

      expect(mockPrometheusExporter).toHaveBeenCalled()
      // PrometheusExporter is a MetricReader itself, not wrapped in PeriodicExportingMetricReader
    })

    it('should use custom Prometheus port', async () => {
      const { createTelemetry } = await import('../../src/utils/otel')

      createTelemetry({
        serviceName: 'test-service',
        metrics: {
          port: 9090,
        },
      })

      expect(mockPrometheusExporter).toHaveBeenCalledWith(
        { port: 9090 },
        expect.any(Function)
      )
    })

    it('should support OTLP metrics exporter', async () => {
      const { createTelemetry } = await import('../../src/utils/otel')

      createTelemetry({
        serviceName: 'test-service',
        metrics: {
          exporters: ['otlp'],
        },
      })

      expect(mockOTLPMetricExporter).toHaveBeenCalled()
      expect(mockPrometheusExporter).not.toHaveBeenCalled()
    })

    it('should support multiple metrics exporters', async () => {
      const { createTelemetry } = await import('../../src/utils/otel')

      createTelemetry({
        serviceName: 'test-service',
        metrics: {
          exporters: ['prometheus', 'otlp'],
        },
      })

      expect(mockPrometheusExporter).toHaveBeenCalled()
      expect(mockOTLPMetricExporter).toHaveBeenCalled()
    })

    it('should disable metrics when enabled: false', async () => {
      const { createTelemetry } = await import('../../src/utils/otel')

      createTelemetry({
        serviceName: 'test-service',
        metrics: {
          enabled: false,
        },
      })

      expect(mockPrometheusExporter).not.toHaveBeenCalled()
      expect(mockOTLPMetricExporter).not.toHaveBeenCalled()
    })
  })

  describe('auto-instrumentation', () => {
    it('should include auto-instrumentations with HTTP hooks', async () => {
      const { createTelemetry } = await import('../../src/utils/otel')

      createTelemetry({
        serviceName: 'test-service',
      })

      expect(mockGetNodeAutoInstrumentations).toHaveBeenCalledWith({
        '@opentelemetry/instrumentation-fs': {
          enabled: false,
        },
      })
      expect(mockHttpInstrumentation).toHaveBeenCalled()
    })
  })

  describe('OTLP configuration via environment', () => {
    it('should use OTEL_EXPORTER_OTLP_ENDPOINT for traces', async () => {
      process.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'https://trace.example.com/v1/traces'

      const { createTelemetry } = await import('../../src/utils/otel')

      createTelemetry({
        serviceName: 'test-service',
        tracing: {
          exporter: 'otlp',
        },
      })

      expect(mockOTLPTraceExporter).toHaveBeenCalledWith({
        url: 'https://trace.example.com/v1/traces',
        headers: {},
      })
    })

    it('should parse OTEL_EXPORTER_OTLP_HEADERS', async () => {
      process.env.OTEL_EXPORTER_OTLP_HEADERS = '{"Authorization":"Bearer token123"}'

      const { createTelemetry } = await import('../../src/utils/otel')

      createTelemetry({
        serviceName: 'test-service',
        tracing: {
          exporter: 'otlp',
        },
      })

      expect(mockOTLPTraceExporter).toHaveBeenCalledWith({
        url: 'http://localhost:4318/v1/traces',
        headers: {
          Authorization: 'Bearer token123',
        },
      })
    })

    it('should handle invalid OTLP headers JSON', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      process.env.OTEL_EXPORTER_OTLP_HEADERS = 'invalid-json'

      const { createTelemetry } = await import('../../src/utils/otel')

      createTelemetry({
        serviceName: 'test-service',
        tracing: {
          exporter: 'otlp',
        },
      })

      expect(consoleSpy).toHaveBeenCalledWith(
        'Invalid OTEL_EXPORTER_OTLP_HEADERS JSON:',
        'invalid-json'
      )
      expect(mockOTLPTraceExporter).toHaveBeenCalledWith({
        url: 'http://localhost:4318/v1/traces',
        headers: {},
      })

      consoleSpy.mockRestore()
    })

    it('should use OTEL_EXPORTER_OTLP_METRICS_ENDPOINT for metrics', async () => {
      process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT = 'https://metrics.example.com/v1/metrics'

      const { createTelemetry } = await import('../../src/utils/otel')

      createTelemetry({
        serviceName: 'test-service',
        metrics: {
          exporters: ['otlp'],
        },
      })

      expect(mockOTLPMetricExporter).toHaveBeenCalledWith({
        url: 'https://metrics.example.com/v1/metrics',
      })
    })

    it('should use JAEGER_ENDPOINT for Jaeger exporter', async () => {
      process.env.JAEGER_ENDPOINT = 'http://jaeger.local:14268/api/traces'

      const { createTelemetry } = await import('../../src/utils/otel')

      createTelemetry({
        serviceName: 'test-service',
        tracing: {
          exporter: 'jaeger',
        },
      })

      expect(mockJaegerExporter).toHaveBeenCalledWith({
        endpoint: 'http://jaeger.local:14268/api/traces',
      })
    })
  })
})

describe('withSpan utility', () => {
  it('should export withSpan utility function', async () => {
    const { withSpan } = await import('../../src/utils/otel')

    expect(withSpan).toBeDefined()
    expect(typeof withSpan).toBe('function')
  })

  // NOTE: Full withSpan functionality is tested in integration tests
  // because it requires active OpenTelemetry context and spans which
  // are difficult to mock correctly in unit tests
})

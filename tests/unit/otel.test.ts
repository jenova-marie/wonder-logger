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

const mockGetTracer = vi.fn(() => ({
  startActiveSpan: vi.fn(),
}))

const mockGetMeter = vi.fn(() => ({
  createHistogram: vi.fn(),
  createCounter: vi.fn(),
}))

vi.mock('@opentelemetry/sdk-node', () => ({
  NodeSDK: mockNodeSDK,
}))

vi.mock('@opentelemetry/resources', () => ({
  resourceFromAttributes: vi.fn((attrs) => ({ attributes: attrs })),
}))

vi.mock('@opentelemetry/auto-instrumentations-node', () => ({
  getNodeAutoInstrumentations: vi.fn(() => []),
}))

vi.mock('@opentelemetry/sdk-metrics', () => ({
  PeriodicExportingMetricReader: vi.fn(),
}))

vi.mock('@opentelemetry/semantic-conventions', () => ({
  SEMRESATTRS_SERVICE_NAME: 'service.name',
  SEMRESATTRS_SERVICE_VERSION: 'service.version',
}))

vi.mock('@opentelemetry/exporter-trace-otlp-http', () => ({
  OTLPTraceExporter: vi.fn(),
}))

vi.mock('@opentelemetry/exporter-jaeger', () => ({
  JaegerExporter: vi.fn(),
}))

vi.mock('@opentelemetry/sdk-trace-base', () => ({
  ConsoleSpanExporter: vi.fn(),
}))

vi.mock('@opentelemetry/exporter-metrics-otlp-http', () => ({
  OTLPMetricExporter: vi.fn(),
}))

vi.mock('@opentelemetry/exporter-prometheus', () => ({
  PrometheusExporter: vi.fn(),
}))

vi.mock('@opentelemetry/api', () => ({
  trace: {
    getTracer: mockGetTracer,
  },
  metrics: {
    getMeter: mockGetMeter,
  },
}))

describe('otel.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
    delete process.env.OTEL_SERVICE_NAME
    delete process.env.OTEL_SERVICE_VERSION
    delete process.env.NODE_ENV
    delete process.env.OTEL_TRACE_EXPORTER
    delete process.env.OTEL_METRIC_EXPORTER
    delete process.env.OTEL_SDK_DISABLED
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('RecoverySkyTelemetry class', () => {
    it('should create instance with default service name', async () => {
      const { RecoverySkyTelemetry } = await import('../../src/utils/otel')

      const telemetry = new RecoverySkyTelemetry()

      // Access private fields via test
      expect(telemetry).toBeDefined()
    })

    it('should use OTEL_SERVICE_NAME environment variable', async () => {
      process.env.OTEL_SERVICE_NAME = 'custom-service'

      const { RecoverySkyTelemetry } = await import('../../src/utils/otel')
      const telemetry = new RecoverySkyTelemetry()

      telemetry.init()

      const sdkCall = mockNodeSDK.mock.calls[0][0]
      expect(sdkCall.resource.attributes['service.name']).toBe('custom-service')
    })

    it('should use OTEL_SERVICE_VERSION environment variable', async () => {
      process.env.OTEL_SERVICE_VERSION = '2.0.0'

      const { RecoverySkyTelemetry } = await import('../../src/utils/otel')
      const telemetry = new RecoverySkyTelemetry()

      telemetry.init()

      const sdkCall = mockNodeSDK.mock.calls[0][0]
      expect(sdkCall.resource.attributes['service.version']).toBe('2.0.0')
    })
  })

  describe('initialization', () => {
    it('should initialize SDK with defaults', async () => {
      const { RecoverySkyTelemetry } = await import('../../src/utils/otel')
      const telemetry = new RecoverySkyTelemetry()

      telemetry.init()

      expect(mockNodeSDK).toHaveBeenCalled()
      expect(mockSDKStart).toHaveBeenCalled()
    })

    it('should warn if already initialized', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const { RecoverySkyTelemetry } = await import('../../src/utils/otel')
      const telemetry = new RecoverySkyTelemetry()

      telemetry.init()
      telemetry.init() // Second call

      expect(consoleSpy).toHaveBeenCalledWith('OpenTelemetry already initialized')
      consoleSpy.mockRestore()
    })

    it('should initialize tracer and meter', async () => {
      const { RecoverySkyTelemetry } = await import('../../src/utils/otel')
      const telemetry = new RecoverySkyTelemetry()

      telemetry.init()

      const tracer = telemetry.getTracer()
      const meter = telemetry.getMeter()

      expect(tracer).toBeDefined()
      expect(meter).toBeDefined()
    })
  })

  describe('trace exporters', () => {
    it('should use console exporter by default', async () => {
      const { ConsoleSpanExporter } = await import('@opentelemetry/sdk-trace-base')

      const { RecoverySkyTelemetry } = await import('../../src/utils/otel')
      const telemetry = new RecoverySkyTelemetry()

      telemetry.init()

      expect(ConsoleSpanExporter).toHaveBeenCalled()
    })

    it('should use OTLP exporter when configured', async () => {
      process.env.OTEL_TRACE_EXPORTER = 'otlp'
      const { OTLPTraceExporter } = await import('@opentelemetry/exporter-trace-otlp-http')

      const { RecoverySkyTelemetry } = await import('../../src/utils/otel')
      const telemetry = new RecoverySkyTelemetry()

      telemetry.init()

      expect(OTLPTraceExporter).toHaveBeenCalled()
    })

    it('should use Jaeger exporter when configured', async () => {
      process.env.OTEL_TRACE_EXPORTER = 'jaeger'
      const { JaegerExporter } = await import('@opentelemetry/exporter-jaeger')

      const { RecoverySkyTelemetry } = await import('../../src/utils/otel')
      const telemetry = new RecoverySkyTelemetry()

      telemetry.init()

      expect(JaegerExporter).toHaveBeenCalled()
    })
  })

  describe('metric exporters', () => {
    it('should use Prometheus exporter by default', async () => {
      const { PrometheusExporter } = await import('@opentelemetry/exporter-prometheus')

      const { RecoverySkyTelemetry } = await import('../../src/utils/otel')
      const telemetry = new RecoverySkyTelemetry()

      telemetry.init()

      expect(PrometheusExporter).toHaveBeenCalled()
    })

    it('should use OTLP metric exporter when configured', async () => {
      process.env.OTEL_METRIC_EXPORTER = 'otlp'
      const { OTLPMetricExporter } = await import('@opentelemetry/exporter-metrics-otlp-http')

      const { RecoverySkyTelemetry } = await import('../../src/utils/otel')
      const telemetry = new RecoverySkyTelemetry()

      telemetry.init()

      expect(OTLPMetricExporter).toHaveBeenCalled()
    })
  })

  describe('getTracer', () => {
    it('should throw error if not initialized', async () => {
      const { RecoverySkyTelemetry } = await import('../../src/utils/otel')
      const telemetry = new RecoverySkyTelemetry()

      expect(() => telemetry.getTracer()).toThrow(/not initialized/)
    })

    it('should return tracer after initialization', async () => {
      const { RecoverySkyTelemetry } = await import('../../src/utils/otel')
      const telemetry = new RecoverySkyTelemetry()

      telemetry.init()
      const tracer = telemetry.getTracer()

      expect(tracer).toBeDefined()
      expect(mockGetTracer).toHaveBeenCalled()
    })
  })

  describe('getMeter', () => {
    it('should throw error if not initialized', async () => {
      const { RecoverySkyTelemetry } = await import('../../src/utils/otel')
      const telemetry = new RecoverySkyTelemetry()

      expect(() => telemetry.getMeter()).toThrow(/not initialized/)
    })

    it('should return meter after initialization', async () => {
      const { RecoverySkyTelemetry } = await import('../../src/utils/otel')
      const telemetry = new RecoverySkyTelemetry()

      telemetry.init()
      const meter = telemetry.getMeter()

      expect(meter).toBeDefined()
      expect(mockGetMeter).toHaveBeenCalled()
    })
  })

  describe('withSpan', () => {
    it('should throw error if not initialized', async () => {
      const { RecoverySkyTelemetry } = await import('../../src/utils/otel')
      const telemetry = new RecoverySkyTelemetry()

      await expect(
        telemetry.withSpan('test', {}, async () => 'result')
      ).rejects.toThrow(/not initialized/)
    })

    it('should execute function within span', async () => {
      const mockSpan = {
        setStatus: vi.fn(),
        end: vi.fn(),
        recordException: vi.fn(),
      }

      const mockStartActiveSpan = vi.fn((name, options, fn) => {
        return fn(mockSpan)
      })

      mockGetTracer.mockReturnValue({
        startActiveSpan: mockStartActiveSpan,
      })

      const { RecoverySkyTelemetry } = await import('../../src/utils/otel')
      const telemetry = new RecoverySkyTelemetry()

      telemetry.init()

      const result = await telemetry.withSpan('test-span', { key: 'value' }, async () => {
        return 'success'
      })

      expect(result).toBe('success')
      expect(mockStartActiveSpan).toHaveBeenCalledWith(
        'test-span',
        { attributes: { key: 'value' } },
        expect.any(Function)
      )
      expect(mockSpan.setStatus).toHaveBeenCalledWith({ code: 1 })
      expect(mockSpan.end).toHaveBeenCalled()
    })

    it('should record exception on error', async () => {
      const mockSpan = {
        setStatus: vi.fn(),
        end: vi.fn(),
        recordException: vi.fn(),
      }

      const mockStartActiveSpan = vi.fn((name, options, fn) => {
        return fn(mockSpan)
      })

      mockGetTracer.mockReturnValue({
        startActiveSpan: mockStartActiveSpan,
      })

      const { RecoverySkyTelemetry } = await import('../../src/utils/otel')
      const telemetry = new RecoverySkyTelemetry()

      telemetry.init()

      const error = new Error('test error')

      await expect(
        telemetry.withSpan('test-span', {}, async () => {
          throw error
        })
      ).rejects.toThrow('test error')

      expect(mockSpan.recordException).toHaveBeenCalledWith(error)
      expect(mockSpan.setStatus).toHaveBeenCalledWith({
        code: 2,
        message: 'test error',
      })
      expect(mockSpan.end).toHaveBeenCalled()
    })
  })

  describe('shutdown', () => {
    it('should shutdown SDK if initialized', async () => {
      const { RecoverySkyTelemetry } = await import('../../src/utils/otel')
      const telemetry = new RecoverySkyTelemetry()

      telemetry.init()
      await telemetry.shutdown()

      expect(mockSDKShutdown).toHaveBeenCalled()
    })

    it('should not throw if SDK not initialized', async () => {
      const { RecoverySkyTelemetry } = await import('../../src/utils/otel')
      const telemetry = new RecoverySkyTelemetry()

      await expect(telemetry.shutdown()).resolves.not.toThrow()
    })
  })

  describe('singleton export', () => {
    it('should export singleton instance', async () => {
      const otelModule = await import('../../src/utils/otel')

      expect(otelModule.default).toBeDefined()
    })

    it('should export RecoverySkyTelemetry class', async () => {
      const { RecoverySkyTelemetry } = await import('../../src/utils/otel')

      expect(RecoverySkyTelemetry).toBeDefined()
      expect(typeof RecoverySkyTelemetry).toBe('function')
    })
  })

  describe('auto-initialization', () => {
    it('should not auto-initialize in test environment', async () => {
      process.env.NODE_ENV = 'test'
      vi.clearAllMocks()

      await import('../../src/utils/otel')

      // SDK should not be called during module import in test mode
      expect(mockSDKStart).not.toHaveBeenCalled()
    })

    it('should not auto-initialize when disabled', async () => {
      process.env.OTEL_SDK_DISABLED = 'true'
      vi.clearAllMocks()

      await import('../../src/utils/otel')

      expect(mockSDKStart).not.toHaveBeenCalled()
    })
  })

  describe('exporter headers', () => {
    it('should parse OTEL_EXPORTER_OTLP_HEADERS from environment', async () => {
      process.env.OTEL_TRACE_EXPORTER = 'otlp'
      process.env.OTEL_EXPORTER_OTLP_HEADERS = '{"Authorization":"Bearer token123","X-Custom":"value"}'

      const { OTLPTraceExporter } = await import('@opentelemetry/exporter-trace-otlp-http')
      const { RecoverySkyTelemetry } = await import('../../src/utils/otel')
      const telemetry = new RecoverySkyTelemetry()

      telemetry.init()

      const exporterCall = vi.mocked(OTLPTraceExporter).mock.calls[0]
      expect(exporterCall[0]).toHaveProperty('headers')
      expect(exporterCall[0].headers).toMatchObject({
        Authorization: 'Bearer token123',
        'X-Custom': 'value',
      })
    })

    it('should handle invalid OTEL_EXPORTER_OTLP_HEADERS JSON', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      process.env.OTEL_TRACE_EXPORTER = 'otlp'
      process.env.OTEL_EXPORTER_OTLP_HEADERS = 'not-valid-json'

      const { RecoverySkyTelemetry } = await import('../../src/utils/otel')
      const telemetry = new RecoverySkyTelemetry()

      telemetry.init()

      expect(consoleSpy).toHaveBeenCalledWith(
        'Invalid OTEL_EXPORTER_OTLP_HEADERS JSON:',
        'not-valid-json'
      )
      consoleSpy.mockRestore()
    })
  })
})

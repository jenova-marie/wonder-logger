import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createOtelTransport } from '../../../src/utils/logger/transports/otel'

// Mock pino
vi.mock('pino', () => ({
  default: {
    transport: vi.fn((config) => ({ _mock: 'transport', config })),
  },
}))

describe('createOtelTransport', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.NODE_ENV
  })

  describe('basic configuration', () => {
    it('should create OTEL transport with required serviceName', async () => {
      const pino = await import('pino')

      createOtelTransport({ serviceName: 'test-service' })

      expect(pino.default.transport).toHaveBeenCalledWith({
        target: 'pino-opentelemetry-transport',
        options: expect.objectContaining({
          resourceAttributes: expect.objectContaining({
            'service.name': 'test-service',
          }),
        }),
      })
    })

    it('should use default service version', async () => {
      const pino = await import('pino')

      createOtelTransport({ serviceName: 'test-service' })

      const call = vi.mocked(pino.default.transport).mock.calls[0][0]
      expect(call.options.resourceAttributes['service.version']).toBe('1.0.0')
    })

    it('should use custom service version', async () => {
      const pino = await import('pino')

      createOtelTransport({
        serviceName: 'test-service',
        serviceVersion: '2.3.4',
      })

      const call = vi.mocked(pino.default.transport).mock.calls[0][0]
      expect(call.options.resourceAttributes['service.version']).toBe('2.3.4')
    })

    it('should generate default service instance ID from serviceName and PID', async () => {
      const pino = await import('pino')

      createOtelTransport({ serviceName: 'api' })

      const call = vi.mocked(pino.default.transport).mock.calls[0][0]
      expect(call.options.resourceAttributes['service.instance.id']).toBe(
        `api-${process.pid}`
      )
    })

    it('should use custom service instance ID', async () => {
      const pino = await import('pino')

      createOtelTransport({
        serviceName: 'api',
        serviceInstanceId: 'api-instance-1',
      })

      const call = vi.mocked(pino.default.transport).mock.calls[0][0]
      expect(call.options.resourceAttributes['service.instance.id']).toBe(
        'api-instance-1'
      )
    })
  })

  describe('environment configuration', () => {
    it('should use default environment as development', async () => {
      const pino = await import('pino')

      createOtelTransport({ serviceName: 'test' })

      const call = vi.mocked(pino.default.transport).mock.calls[0][0]
      expect(call.options.resourceAttributes.environment).toBe('development')
    })

    it('should use NODE_ENV environment variable', async () => {
      const pino = await import('pino')
      process.env.NODE_ENV = 'production'

      createOtelTransport({ serviceName: 'test' })

      const call = vi.mocked(pino.default.transport).mock.calls[0][0]
      expect(call.options.resourceAttributes.environment).toBe('production')
    })

    it('should allow custom environment override', async () => {
      const pino = await import('pino')
      process.env.NODE_ENV = 'production'

      createOtelTransport({
        serviceName: 'test',
        environment: 'staging',
      })

      const call = vi.mocked(pino.default.transport).mock.calls[0][0]
      expect(call.options.resourceAttributes.environment).toBe('staging')
    })
  })

  describe('endpoint configuration', () => {
    it('should use default OTLP endpoint', async () => {
      const pino = await import('pino')

      createOtelTransport({ serviceName: 'test' })

      const call = vi.mocked(pino.default.transport).mock.calls[0][0]
      expect(call.options.endpoint).toBe('http://localhost:4318/v1/logs')
    })

    it('should use custom endpoint', async () => {
      const pino = await import('pino')

      createOtelTransport({
        serviceName: 'test',
        endpoint: 'https://otel-collector.example.com:4318/v1/logs',
      })

      const call = vi.mocked(pino.default.transport).mock.calls[0][0]
      expect(call.options.endpoint).toBe(
        'https://otel-collector.example.com:4318/v1/logs'
      )
    })
  })

  describe('resource attributes', () => {
    it('should include default resource attributes', async () => {
      const pino = await import('pino')

      createOtelTransport({ serviceName: 'api' })

      const call = vi.mocked(pino.default.transport).mock.calls[0][0]
      expect(call.options.resourceAttributes).toMatchObject({
        'service.name': 'api',
        'service.version': '1.0.0',
        'service.instance.id': `api-${process.pid}`,
        environment: 'development',
      })
    })

    it('should merge custom resource attributes', async () => {
      const pino = await import('pino')

      createOtelTransport({
        serviceName: 'api',
        resourceAttributes: {
          'deployment.environment': 'us-east-1',
          team: 'backend',
          version: 2,
        },
      })

      const call = vi.mocked(pino.default.transport).mock.calls[0][0]
      expect(call.options.resourceAttributes).toMatchObject({
        'service.name': 'api',
        'deployment.environment': 'us-east-1',
        team: 'backend',
        version: 2,
      })
    })
  })

  describe('logger name configuration', () => {
    it('should generate logger name from service name', async () => {
      const pino = await import('pino')

      createOtelTransport({ serviceName: 'auth-service' })

      const call = vi.mocked(pino.default.transport).mock.calls[0][0]
      expect(call.options.loggerName).toBe('auth-service-logger')
    })
  })

  describe('level configuration', () => {
    it('should use default log level', () => {
      const transport = createOtelTransport({ serviceName: 'test' })

      expect(transport.level).toBe('info')
    })

    it('should use custom log level', () => {
      const transport = createOtelTransport({
        serviceName: 'test',
        level: 'debug',
      })

      expect(transport.level).toBe('debug')
    })

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
        const transport = createOtelTransport({
          serviceName: 'test',
          level,
        })
        expect(transport.level).toBe(level)
      })
    })
  })

  describe('export interval configuration', () => {
    it('should use default export interval', async () => {
      const pino = await import('pino')

      createOtelTransport({ serviceName: 'test' })

      const call = vi.mocked(pino.default.transport).mock.calls[0][0]
      expect(call.options.exportIntervalMillis).toBe(5000)
    })

    it('should use custom export interval', async () => {
      const pino = await import('pino')

      createOtelTransport({
        serviceName: 'test',
        exportIntervalMillis: 10000,
      })

      const call = vi.mocked(pino.default.transport).mock.calls[0][0]
      expect(call.options.exportIntervalMillis).toBe(10000)
    })
  })

  describe('transport return value', () => {
    it('should return pino stream entry with level and stream', async () => {
      const transport = createOtelTransport({ serviceName: 'test' })

      expect(transport).toHaveProperty('level')
      expect(transport).toHaveProperty('stream')
      expect(transport.level).toBe('info')
    })
  })

  describe('complete configuration', () => {
    it('should handle all options together', async () => {
      const pino = await import('pino')

      createOtelTransport({
        serviceName: 'payment-service',
        serviceVersion: '3.2.1',
        serviceInstanceId: 'payment-prod-1',
        environment: 'production',
        endpoint: 'https://collector.prod.example.com:4318/v1/logs',
        resourceAttributes: {
          region: 'us-west-2',
          cluster: 'prod-cluster',
        },
        level: 'warn',
        exportIntervalMillis: 15000,
      })

      expect(pino.default.transport).toHaveBeenCalledWith({
        target: 'pino-opentelemetry-transport',
        options: {
          resourceAttributes: {
            'service.name': 'payment-service',
            'service.version': '3.2.1',
            'service.instance.id': 'payment-prod-1',
            environment: 'production',
            region: 'us-west-2',
            cluster: 'prod-cluster',
          },
          loggerName: 'payment-service-logger',
          endpoint: 'https://collector.prod.example.com:4318/v1/logs',
          exportIntervalMillis: 15000,
        },
      })
    })
  })
})

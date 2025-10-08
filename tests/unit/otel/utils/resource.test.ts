import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Store original environment
const originalEnv = process.env

// Mock OpenTelemetry resources
const mockResourceFromAttributes = vi.fn((attrs) => ({ attributes: attrs }))

vi.mock('@opentelemetry/resources', () => ({
  resourceFromAttributes: mockResourceFromAttributes,
}))

vi.mock('@opentelemetry/semantic-conventions', () => ({
  SEMRESATTRS_SERVICE_NAME: 'service.name',
  SEMRESATTRS_SERVICE_VERSION: 'service.version',
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT: 'deployment.environment',
}))

describe('resource builder', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
    delete process.env.NODE_ENV
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('createResource', () => {
    it('should create resource with required service name', async () => {
      const { createResource } = await import('../../../../src/utils/otel/utils/resource')

      const resource = createResource({
        serviceName: 'my-service',
      })

      expect(mockResourceFromAttributes).toHaveBeenCalledWith({
        'service.name': 'my-service',
        'service.version': '0.0.0',
        'deployment.environment': 'development',
      })
      expect(resource).toBeDefined()
    })

    it('should create resource with custom service version', async () => {
      const { createResource } = await import('../../../../src/utils/otel/utils/resource')

      createResource({
        serviceName: 'my-service',
        serviceVersion: '2.1.3',
      })

      expect(mockResourceFromAttributes).toHaveBeenCalledWith({
        'service.name': 'my-service',
        'service.version': '2.1.3',
        'deployment.environment': 'development',
      })
    })

    it('should create resource with custom environment', async () => {
      const { createResource } = await import('../../../../src/utils/otel/utils/resource')

      createResource({
        serviceName: 'my-service',
        environment: 'production',
      })

      expect(mockResourceFromAttributes).toHaveBeenCalledWith({
        'service.name': 'my-service',
        'service.version': '0.0.0',
        'deployment.environment': 'production',
      })
    })

    it('should use NODE_ENV when environment not provided', async () => {
      process.env.NODE_ENV = 'staging'

      const { createResource } = await import('../../../../src/utils/otel/utils/resource')

      createResource({
        serviceName: 'my-service',
      })

      expect(mockResourceFromAttributes).toHaveBeenCalledWith({
        'service.name': 'my-service',
        'service.version': '0.0.0',
        'deployment.environment': 'staging',
      })
    })

    it('should default to development when NODE_ENV not set', async () => {
      delete process.env.NODE_ENV

      const { createResource } = await import('../../../../src/utils/otel/utils/resource')

      createResource({
        serviceName: 'my-service',
      })

      expect(mockResourceFromAttributes).toHaveBeenCalledWith({
        'service.name': 'my-service',
        'service.version': '0.0.0',
        'deployment.environment': 'development',
      })
    })

    it('should create resource with all custom fields', async () => {
      const { createResource } = await import('../../../../src/utils/otel/utils/resource')

      createResource({
        serviceName: 'custom-api',
        serviceVersion: '3.2.1',
        environment: 'qa',
      })

      expect(mockResourceFromAttributes).toHaveBeenCalledWith({
        'service.name': 'custom-api',
        'service.version': '3.2.1',
        'deployment.environment': 'qa',
      })
    })

    it('should return resource object from resourceFromAttributes', async () => {
      const mockReturnValue = { attributes: { foo: 'bar' } }
      mockResourceFromAttributes.mockReturnValue(mockReturnValue)

      const { createResource } = await import('../../../../src/utils/otel/utils/resource')

      const result = createResource({
        serviceName: 'test',
      })

      expect(result).toBe(mockReturnValue)
    })
  })
})

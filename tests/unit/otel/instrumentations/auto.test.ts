import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock auto-instrumentations
const mockGetNodeAutoInstrumentations = vi.fn(() => ['mock-instrumentation-1', 'mock-instrumentation-2'])
const mockHttpInstrumentation = vi.fn()

vi.mock('@opentelemetry/auto-instrumentations-node', () => ({
  getNodeAutoInstrumentations: mockGetNodeAutoInstrumentations,
}))

vi.mock('@opentelemetry/instrumentation-http', () => ({
  HttpInstrumentation: mockHttpInstrumentation,
}))

// Mock httpHooks
vi.mock('../../../../src/utils/otel/instrumentations/httpHooks', () => ({
  createHttpRequestHook: vi.fn(() => 'requestHook'),
  createHttpResponseHook: vi.fn(() => 'responseHook'),
}))

describe('auto-instrumentation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createAutoInstrumentations', () => {
    it('should create base auto-instrumentations without HTTP hooks by default', async () => {
      const { createAutoInstrumentations } = await import('../../../../src/utils/otel/instrumentations/auto')

      const result = createAutoInstrumentations()

      expect(mockGetNodeAutoInstrumentations).toHaveBeenCalledWith({
        '@opentelemetry/instrumentation-fs': {
          enabled: false,
        },
      })
      expect(mockHttpInstrumentation).not.toHaveBeenCalled()
      expect(result).toEqual(['mock-instrumentation-1', 'mock-instrumentation-2'])
    })

    it('should disable filesystem instrumentation for performance', async () => {
      const { createAutoInstrumentations } = await import('../../../../src/utils/otel/instrumentations/auto')

      createAutoInstrumentations()

      expect(mockGetNodeAutoInstrumentations).toHaveBeenCalledWith(
        expect.objectContaining({
          '@opentelemetry/instrumentation-fs': {
            enabled: false,
          },
        })
      )
    })

    it('should include HTTP hooks when includeHttpHooks is true', async () => {
      mockHttpInstrumentation.mockReturnValueOnce('http-instrumentation-with-hooks')

      const { createAutoInstrumentations } = await import('../../../../src/utils/otel/instrumentations/auto')

      const result = createAutoInstrumentations({ includeHttpHooks: true })

      expect(mockHttpInstrumentation).toHaveBeenCalledWith({
        requestHook: 'requestHook',
        responseHook: 'responseHook',
      })
      expect(result).toHaveLength(3)
      expect(result[0]).toBe('mock-instrumentation-1')
      expect(result[1]).toBe('mock-instrumentation-2')
      expect(typeof result[2]).toBe('object') // HttpInstrumentation instance
    })

    it('should not include HTTP hooks when includeHttpHooks is false', async () => {
      const { createAutoInstrumentations } = await import('../../../../src/utils/otel/instrumentations/auto')

      const result = createAutoInstrumentations({ includeHttpHooks: false })

      expect(mockHttpInstrumentation).not.toHaveBeenCalled()
      expect(result).toEqual(['mock-instrumentation-1', 'mock-instrumentation-2'])
    })

    it('should accept empty options object', async () => {
      const { createAutoInstrumentations } = await import('../../../../src/utils/otel/instrumentations/auto')

      const result = createAutoInstrumentations({})

      expect(mockGetNodeAutoInstrumentations).toHaveBeenCalled()
      expect(mockHttpInstrumentation).not.toHaveBeenCalled()
      expect(result).toBeDefined()
    })

    it('should return array of instrumentations', async () => {
      const { createAutoInstrumentations } = await import('../../../../src/utils/otel/instrumentations/auto')

      const result = createAutoInstrumentations()

      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThan(0)
    })

    it('should include HTTP instrumentation in correct position when hooks enabled', async () => {
      const { createAutoInstrumentations } = await import('../../../../src/utils/otel/instrumentations/auto')

      const result = createAutoInstrumentations({ includeHttpHooks: true })

      // HTTP instrumentation should be last in the array
      expect(result).toHaveLength(3)
      expect(result[0]).toBe('mock-instrumentation-1')
      expect(result[1]).toBe('mock-instrumentation-2')
      expect(typeof result[2]).toBe('object') // HttpInstrumentation is last
    })

    it('should call hook creators when HTTP hooks enabled', async () => {
      const { createAutoInstrumentations } = await import('../../../../src/utils/otel/instrumentations/auto')
      const { createHttpRequestHook, createHttpResponseHook } = await import('../../../../src/utils/otel/instrumentations/httpHooks')

      createAutoInstrumentations({ includeHttpHooks: true })

      expect(createHttpRequestHook).toHaveBeenCalled()
      expect(createHttpResponseHook).toHaveBeenCalled()
    })

    it('should not call hook creators when HTTP hooks disabled', async () => {
      const { createAutoInstrumentations } = await import('../../../../src/utils/otel/instrumentations/auto')
      const { createHttpRequestHook, createHttpResponseHook } = await import('../../../../src/utils/otel/instrumentations/httpHooks')

      createAutoInstrumentations({ includeHttpHooks: false })

      expect(createHttpRequestHook).not.toHaveBeenCalled()
      expect(createHttpResponseHook).not.toHaveBeenCalled()
    })
  })
})

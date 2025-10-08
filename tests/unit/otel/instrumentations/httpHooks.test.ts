import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('HTTP instrumentation hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createHttpRequestHook', () => {
    it('should create a request hook function', async () => {
      const { createHttpRequestHook } = await import('../../../../src/utils/otel/instrumentations/httpHooks')

      const hook = createHttpRequestHook()

      expect(hook).toBeDefined()
      expect(typeof hook).toBe('function')
    })

    it('should set user-agent attribute from request header', async () => {
      const { createHttpRequestHook } = await import('../../../../src/utils/otel/instrumentations/httpHooks')

      const mockSpan = {
        setAttributes: vi.fn(),
      }

      const mockRequest = {
        getHeader: vi.fn((name: string) => {
          if (name === 'user-agent') return 'Mozilla/5.0'
          return undefined
        }),
      }

      const hook = createHttpRequestHook()
      hook(mockSpan as any, mockRequest)

      expect(mockSpan.setAttributes).toHaveBeenCalledWith({
        'http.user_agent': 'Mozilla/5.0',
        'http.x_forwarded_for': undefined,
        'http.x_request_id': undefined,
        'http.x_correlation_id': undefined,
      })
    })

    it('should default user-agent to "unknown" if not present', async () => {
      const { createHttpRequestHook } = await import('../../../../src/utils/otel/instrumentations/httpHooks')

      const mockSpan = {
        setAttributes: vi.fn(),
      }

      const mockRequest = {
        getHeader: vi.fn(() => undefined),
      }

      const hook = createHttpRequestHook()
      hook(mockSpan as any, mockRequest)

      expect(mockSpan.setAttributes).toHaveBeenCalledWith({
        'http.user_agent': 'unknown',
        'http.x_forwarded_for': undefined,
        'http.x_request_id': undefined,
        'http.x_correlation_id': undefined,
      })
    })

    it('should capture x-forwarded-for header', async () => {
      const { createHttpRequestHook } = await import('../../../../src/utils/otel/instrumentations/httpHooks')

      const mockSpan = {
        setAttributes: vi.fn(),
      }

      const mockRequest = {
        getHeader: vi.fn((name: string) => {
          if (name === 'x-forwarded-for') return '192.168.1.1'
          return undefined
        }),
      }

      const hook = createHttpRequestHook()
      hook(mockSpan as any, mockRequest)

      expect(mockSpan.setAttributes).toHaveBeenCalledWith(
        expect.objectContaining({
          'http.x_forwarded_for': '192.168.1.1',
        })
      )
    })

    it('should capture x-request-id header', async () => {
      const { createHttpRequestHook } = await import('../../../../src/utils/otel/instrumentations/httpHooks')

      const mockSpan = {
        setAttributes: vi.fn(),
      }

      const mockRequest = {
        getHeader: vi.fn((name: string) => {
          if (name === 'x-request-id') return 'req-123'
          return undefined
        }),
      }

      const hook = createHttpRequestHook()
      hook(mockSpan as any, mockRequest)

      expect(mockSpan.setAttributes).toHaveBeenCalledWith(
        expect.objectContaining({
          'http.x_request_id': 'req-123',
        })
      )
    })

    it('should capture x-correlation-id header', async () => {
      const { createHttpRequestHook } = await import('../../../../src/utils/otel/instrumentations/httpHooks')

      const mockSpan = {
        setAttributes: vi.fn(),
      }

      const mockRequest = {
        getHeader: vi.fn((name: string) => {
          if (name === 'x-correlation-id') return 'corr-456'
          return undefined
        }),
      }

      const hook = createHttpRequestHook()
      hook(mockSpan as any, mockRequest)

      expect(mockSpan.setAttributes).toHaveBeenCalledWith(
        expect.objectContaining({
          'http.x_correlation_id': 'corr-456',
        })
      )
    })

    it('should capture all headers when present', async () => {
      const { createHttpRequestHook } = await import('../../../../src/utils/otel/instrumentations/httpHooks')

      const mockSpan = {
        setAttributes: vi.fn(),
      }

      const mockRequest = {
        getHeader: vi.fn((name: string) => {
          const headers: Record<string, string> = {
            'user-agent': 'curl/7.68.0',
            'x-forwarded-for': '10.0.0.1, 192.168.1.1',
            'x-request-id': 'req-789',
            'x-correlation-id': 'corr-xyz',
          }
          return headers[name]
        }),
      }

      const hook = createHttpRequestHook()
      hook(mockSpan as any, mockRequest)

      expect(mockSpan.setAttributes).toHaveBeenCalledWith({
        'http.user_agent': 'curl/7.68.0',
        'http.x_forwarded_for': '10.0.0.1, 192.168.1.1',
        'http.x_request_id': 'req-789',
        'http.x_correlation_id': 'corr-xyz',
      })
    })
  })

  describe('createHttpResponseHook', () => {
    it('should create a response hook function', async () => {
      const { createHttpResponseHook } = await import('../../../../src/utils/otel/instrumentations/httpHooks')

      const hook = createHttpResponseHook()

      expect(hook).toBeDefined()
      expect(typeof hook).toBe('function')
    })

    it('should set content-length attribute from response header', async () => {
      const { createHttpResponseHook } = await import('../../../../src/utils/otel/instrumentations/httpHooks')

      const mockSpan = {
        setAttributes: vi.fn(),
      }

      const mockResponse = {
        getHeader: vi.fn((name: string) => {
          if (name === 'content-length') return '1234'
          return undefined
        }),
      }

      const hook = createHttpResponseHook()
      hook(mockSpan as any, mockResponse)

      expect(mockSpan.setAttributes).toHaveBeenCalledWith({
        'http.response.content_length': '1234',
        'http.response.content_type': undefined,
      })
    })

    it('should set content-type attribute from response header', async () => {
      const { createHttpResponseHook } = await import('../../../../src/utils/otel/instrumentations/httpHooks')

      const mockSpan = {
        setAttributes: vi.fn(),
      }

      const mockResponse = {
        getHeader: vi.fn((name: string) => {
          if (name === 'content-type') return 'application/json'
          return undefined
        }),
      }

      const hook = createHttpResponseHook()
      hook(mockSpan as any, mockResponse)

      expect(mockSpan.setAttributes).toHaveBeenCalledWith({
        'http.response.content_length': undefined,
        'http.response.content_type': 'application/json',
      })
    })

    it('should capture both content-length and content-type', async () => {
      const { createHttpResponseHook } = await import('../../../../src/utils/otel/instrumentations/httpHooks')

      const mockSpan = {
        setAttributes: vi.fn(),
      }

      const mockResponse = {
        getHeader: vi.fn((name: string) => {
          const headers: Record<string, string> = {
            'content-length': '5678',
            'content-type': 'text/html; charset=utf-8',
          }
          return headers[name]
        }),
      }

      const hook = createHttpResponseHook()
      hook(mockSpan as any, mockResponse)

      expect(mockSpan.setAttributes).toHaveBeenCalledWith({
        'http.response.content_length': '5678',
        'http.response.content_type': 'text/html; charset=utf-8',
      })
    })

    it('should handle missing headers', async () => {
      const { createHttpResponseHook } = await import('../../../../src/utils/otel/instrumentations/httpHooks')

      const mockSpan = {
        setAttributes: vi.fn(),
      }

      const mockResponse = {
        getHeader: vi.fn(() => undefined),
      }

      const hook = createHttpResponseHook()
      hook(mockSpan as any, mockResponse)

      expect(mockSpan.setAttributes).toHaveBeenCalledWith({
        'http.response.content_length': undefined,
        'http.response.content_type': undefined,
      })
    })
  })
})

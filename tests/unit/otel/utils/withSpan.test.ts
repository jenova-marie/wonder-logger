import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock OpenTelemetry API
const mockSpan = {
  setStatus: vi.fn(),
  end: vi.fn(),
  recordException: vi.fn(),
}

const mockTracer = {
  startSpan: vi.fn(() => mockSpan),
}

const mockActiveContext = {
  setValue: vi.fn(() => mockActiveContext),
}

const mockTrace = {
  getTracer: vi.fn(() => mockTracer),
  setSpan: vi.fn((ctx, span) => mockActiveContext),
}

const mockContext = {
  active: vi.fn(() => mockActiveContext),
  with: vi.fn((ctx, fn) => fn()),
}

vi.mock('@opentelemetry/api', () => ({
  trace: mockTrace,
  context: mockContext,
  SpanStatusCode: {
    OK: 1,
    ERROR: 2,
  },
}))

describe('withSpan utility', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('withSpan', () => {
    it('should get tracer with default name', async () => {
      const { withSpan } = await import('../../../../src/utils/otel/utils/withSpan')

      await withSpan('test-span', async () => 'result')

      expect(mockTrace.getTracer).toHaveBeenCalledWith('default')
    })

    it('should get tracer with custom name when provided', async () => {
      const { withSpan } = await import('../../../../src/utils/otel/utils/withSpan')

      await withSpan('test-span', async () => 'result', 'my-custom-tracer')

      expect(mockTrace.getTracer).toHaveBeenCalledWith('my-custom-tracer')
    })

    it('should start span with provided name', async () => {
      const { withSpan } = await import('../../../../src/utils/otel/utils/withSpan')

      await withSpan('my-operation', async () => 'result')

      expect(mockTracer.startSpan).toHaveBeenCalledWith('my-operation')
    })

    it('should execute function and return its result', async () => {
      const { withSpan } = await import('../../../../src/utils/otel/utils/withSpan')

      const result = await withSpan('test', async () => 'success')

      expect(result).toBe('success')
    })

    it('should set span status to OK on success', async () => {
      const { withSpan } = await import('../../../../src/utils/otel/utils/withSpan')

      await withSpan('test', async () => 'result')

      expect(mockSpan.setStatus).toHaveBeenCalledWith({ code: 1 })
    })

    it('should end span after successful execution', async () => {
      const { withSpan } = await import('../../../../src/utils/otel/utils/withSpan')

      await withSpan('test', async () => 'result')

      expect(mockSpan.end).toHaveBeenCalled()
    })

    it('should set span status to ERROR when function throws', async () => {
      const { withSpan } = await import('../../../../src/utils/otel/utils/withSpan')

      const error = new Error('Test error')

      await expect(
        withSpan('test', async () => {
          throw error
        })
      ).rejects.toThrow('Test error')

      expect(mockSpan.setStatus).toHaveBeenCalledWith({
        code: 2,
        message: 'Test error',
      })
    })

    it('should record exception when function throws', async () => {
      const { withSpan } = await import('../../../../src/utils/otel/utils/withSpan')

      const error = new Error('Test error')

      await expect(
        withSpan('test', async () => {
          throw error
        })
      ).rejects.toThrow()

      expect(mockSpan.recordException).toHaveBeenCalledWith(error)
    })

    it('should end span even when function throws', async () => {
      const { withSpan } = await import('../../../../src/utils/otel/utils/withSpan')

      await expect(
        withSpan('test', async () => {
          throw new Error('Test error')
        })
      ).rejects.toThrow()

      expect(mockSpan.end).toHaveBeenCalled()
    })

    it('should re-throw error after recording', async () => {
      const { withSpan } = await import('../../../../src/utils/otel/utils/withSpan')

      const error = new Error('Original error')

      await expect(
        withSpan('test', async () => {
          throw error
        })
      ).rejects.toThrow('Original error')
    })

    it('should handle non-Error exceptions', async () => {
      const { withSpan } = await import('../../../../src/utils/otel/utils/withSpan')

      await expect(
        withSpan('test', async () => {
          throw 'string error'
        })
      ).rejects.toBe('string error')

      expect(mockSpan.setStatus).toHaveBeenCalledWith({
        code: 2,
        message: 'string error',
      })
    })

    it('should set active context with span', async () => {
      const { withSpan } = await import('../../../../src/utils/otel/utils/withSpan')

      await withSpan('test', async () => 'result')

      expect(mockContext.active).toHaveBeenCalled()
      expect(mockTrace.setSpan).toHaveBeenCalledWith(mockActiveContext, mockSpan)
    })

    it('should execute function within context', async () => {
      const { withSpan } = await import('../../../../src/utils/otel/utils/withSpan')

      await withSpan('test', async () => 'result')

      expect(mockContext.with).toHaveBeenCalled()
      expect(mockContext.with).toHaveBeenCalledWith(mockActiveContext, expect.any(Function))
    })

    it('should handle async operations correctly', async () => {
      const { withSpan } = await import('../../../../src/utils/otel/utils/withSpan')

      let executed = false

      const result = await withSpan('test', async () => {
        await new Promise((resolve) => setTimeout(resolve, 10))
        executed = true
        return 'async result'
      })

      expect(executed).toBe(true)
      expect(result).toBe('async result')
      expect(mockSpan.setStatus).toHaveBeenCalledWith({ code: 1 })
      expect(mockSpan.end).toHaveBeenCalled()
    })

    it('should support nested withSpan calls', async () => {
      const { withSpan } = await import('../../../../src/utils/otel/utils/withSpan')

      const result = await withSpan('outer', async () => {
        return await withSpan('inner', async () => {
          return 'nested result'
        })
      })

      expect(result).toBe('nested result')
      expect(mockTracer.startSpan).toHaveBeenCalledTimes(2)
      expect(mockTracer.startSpan).toHaveBeenNthCalledWith(1, 'outer')
      expect(mockTracer.startSpan).toHaveBeenNthCalledWith(2, 'inner')
    })

    it('should handle different tracer names for different spans', async () => {
      const { withSpan } = await import('../../../../src/utils/otel/utils/withSpan')

      await withSpan('span1', async () => 'result1', 'tracer1')
      await withSpan('span2', async () => 'result2', 'tracer2')

      expect(mockTrace.getTracer).toHaveBeenNthCalledWith(1, 'tracer1')
      expect(mockTrace.getTracer).toHaveBeenNthCalledWith(2, 'tracer2')
    })

    it('should return complex objects from wrapped function', async () => {
      const { withSpan } = await import('../../../../src/utils/otel/utils/withSpan')

      const complexResult = { data: [1, 2, 3], status: 'ok', nested: { value: 42 } }

      const result = await withSpan('test', async () => complexResult)

      expect(result).toEqual(complexResult)
    })
  })
})

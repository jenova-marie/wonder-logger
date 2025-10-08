import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock PrometheusExporter
const mockPrometheusExporter = vi.fn()

vi.mock('@opentelemetry/exporter-prometheus', () => ({
  PrometheusExporter: mockPrometheusExporter,
}))

describe('Prometheus metrics exporter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  describe('createPrometheusExporter', () => {
    it('should create PrometheusExporter with default port', async () => {
      const { createPrometheusExporter } = await import('../../../../../src/utils/otel/exporters/metrics/prometheus')

      createPrometheusExporter()

      expect(mockPrometheusExporter).toHaveBeenCalledWith(
        { port: 9464 },
        expect.any(Function)
      )
    })

    it('should create PrometheusExporter with custom port', async () => {
      const { createPrometheusExporter } = await import('../../../../../src/utils/otel/exporters/metrics/prometheus')

      createPrometheusExporter(9090)

      expect(mockPrometheusExporter).toHaveBeenCalledWith(
        { port: 9090 },
        expect.any(Function)
      )
    })

    it('should log metrics endpoint on creation', async () => {
      const consoleSpy = vi.spyOn(console, 'log')
      const { createPrometheusExporter } = await import('../../../../../src/utils/otel/exporters/metrics/prometheus')

      createPrometheusExporter(8080)

      // Get the callback function and call it
      const callback = mockPrometheusExporter.mock.calls[0][1]
      callback()

      expect(consoleSpy).toHaveBeenCalledWith(
        '📊 Prometheus metrics available at http://localhost:8080/metrics'
      )

      consoleSpy.mockRestore()
    })

    it('should use default port in log message when not specified', async () => {
      const consoleSpy = vi.spyOn(console, 'log')
      const { createPrometheusExporter } = await import('../../../../../src/utils/otel/exporters/metrics/prometheus')

      createPrometheusExporter()

      // Get the callback function and call it
      const callback = mockPrometheusExporter.mock.calls[0][1]
      callback()

      expect(consoleSpy).toHaveBeenCalledWith(
        '📊 Prometheus metrics available at http://localhost:9464/metrics'
      )

      consoleSpy.mockRestore()
    })

    it('should support various port numbers', async () => {
      const { createPrometheusExporter } = await import('../../../../../src/utils/otel/exporters/metrics/prometheus')

      createPrometheusExporter(3000)
      createPrometheusExporter(8888)
      createPrometheusExporter(10000)

      expect(mockPrometheusExporter).toHaveBeenNthCalledWith(1, { port: 3000 }, expect.any(Function))
      expect(mockPrometheusExporter).toHaveBeenNthCalledWith(2, { port: 8888 }, expect.any(Function))
      expect(mockPrometheusExporter).toHaveBeenNthCalledWith(3, { port: 10000 }, expect.any(Function))
    })

    it('should return exporter instance', async () => {
      const mockExporter = { startServer: vi.fn(), stopServer: vi.fn() }
      mockPrometheusExporter.mockReturnValue(mockExporter)

      const { createPrometheusExporter } = await import('../../../../../src/utils/otel/exporters/metrics/prometheus')

      const result = createPrometheusExporter()

      expect(result).toBe(mockExporter)
    })

    it('should create new instance on each call', async () => {
      const { createPrometheusExporter } = await import('../../../../../src/utils/otel/exporters/metrics/prometheus')

      createPrometheusExporter(9464)
      createPrometheusExporter(9464)
      createPrometheusExporter(9464)

      expect(mockPrometheusExporter).toHaveBeenCalledTimes(3)
    })
  })
})

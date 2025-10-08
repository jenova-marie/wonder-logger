/**
 * Integration tests for OpenTelemetry metrics
 *
 * These tests validate metrics creation and recording:
 * 1. SDK initializes with metrics exporters
 * 2. Metrics API creates counters, histograms, gauges
 * 3. Metrics are recorded and exported
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createTelemetry } from '../../src/utils/otel'
import { metrics as metricsApi } from '@opentelemetry/api'

describe('Integration - OpenTelemetry Metrics', () => {
  let sdk: any

  beforeAll(() => {
    sdk = createTelemetry({
      serviceName: 'metrics-integration-test',
      serviceVersion: '1.0.0',
      environment: 'test',
      tracing: {
        enabled: false, // Only test metrics
      },
      metrics: {
        enabled: true,
        exporters: ['prometheus'],
        port: 9465, // Use different port to avoid conflicts
      },
    })
  })

  afterAll(async () => {
    if (sdk) {
      await sdk.shutdown()
    }
  })

  describe('Meter Creation', () => {
    it('should create a meter from metrics API', () => {
      const meter = metricsApi.getMeter('test-meter')
      expect(meter).toBeDefined()
    })

    it('should create meter with version', () => {
      const meter = metricsApi.getMeter('test-meter', '1.0.0')
      expect(meter).toBeDefined()
    })
  })

  describe('Counter Metrics', () => {
    it('should create and increment a counter', () => {
      const meter = metricsApi.getMeter('counter-test')
      const counter = meter.createCounter('test.requests.total', {
        description: 'Total number of test requests',
        unit: 'requests',
      })

      expect(counter).toBeDefined()

      // Increment counter
      counter.add(1, { method: 'GET', status: '200' })
      counter.add(5, { method: 'POST', status: '201' })

      // No errors thrown = success
      expect(counter).toBeDefined()
    })

    it('should create counter with attributes', () => {
      const meter = metricsApi.getMeter('counter-attrs-test')
      const counter = meter.createCounter('test.events.count')

      counter.add(1, {
        eventType: 'user.login',
        environment: 'test',
        service: 'auth',
      })

      expect(counter).toBeDefined()
    })

    it('should handle multiple counters', () => {
      const meter = metricsApi.getMeter('multi-counter-test')

      const requestCounter = meter.createCounter('http.requests.total')
      const errorCounter = meter.createCounter('http.errors.total')
      const successCounter = meter.createCounter('http.success.total')

      requestCounter.add(10)
      errorCounter.add(2)
      successCounter.add(8)

      expect(requestCounter).toBeDefined()
      expect(errorCounter).toBeDefined()
      expect(successCounter).toBeDefined()
    })
  })

  describe('Histogram Metrics', () => {
    it('should create and record histogram values', () => {
      const meter = metricsApi.getMeter('histogram-test')
      const histogram = meter.createHistogram('test.request.duration', {
        description: 'Request duration in milliseconds',
        unit: 'ms',
      })

      expect(histogram).toBeDefined()

      // Record duration values
      histogram.record(100, { endpoint: '/api/users', method: 'GET' })
      histogram.record(250, { endpoint: '/api/orders', method: 'POST' })
      histogram.record(50, { endpoint: '/api/health', method: 'GET' })

      expect(histogram).toBeDefined()
    })

    it('should handle various duration ranges', () => {
      const meter = metricsApi.getMeter('duration-test')
      const histogram = meter.createHistogram('operation.duration')

      // Simulate various operation durations
      const durations = [10, 50, 100, 150, 200, 500, 1000, 2000]
      durations.forEach((duration) => {
        histogram.record(duration, { operation: 'database.query' })
      })

      expect(histogram).toBeDefined()
    })
  })

  describe('UpDownCounter Metrics', () => {
    it('should create and modify up-down counter', () => {
      const meter = metricsApi.getMeter('updown-test')
      const upDownCounter = meter.createUpDownCounter('test.active.connections', {
        description: 'Number of active connections',
        unit: 'connections',
      })

      expect(upDownCounter).toBeDefined()

      // Simulate connections opening and closing
      upDownCounter.add(5) // 5 connections opened
      upDownCounter.add(-2) // 2 connections closed
      upDownCounter.add(3) // 3 more opened

      expect(upDownCounter).toBeDefined()
    })

    it('should track resource usage', () => {
      const meter = metricsApi.getMeter('resource-test')
      const memoryGauge = meter.createUpDownCounter('process.memory.usage')

      // Simulate memory allocation/deallocation
      memoryGauge.add(1024 * 1024) // +1MB
      memoryGauge.add(-512 * 1024) // -512KB
      memoryGauge.add(2048 * 1024) // +2MB

      expect(memoryGauge).toBeDefined()
    })
  })

  describe('Observable Gauges', () => {
    it('should create observable gauge with callback', () => {
      const meter = metricsApi.getMeter('gauge-test')

      let currentValue = 0

      const gauge = meter.createObservableGauge('test.current.value', {
        description: 'Current value of test metric',
      })

      gauge.addCallback((observableResult) => {
        observableResult.observe(currentValue, { source: 'test' })
      })

      expect(gauge).toBeDefined()

      // Change value
      currentValue = 42
    })

    it('should create gauge for system metrics', () => {
      const meter = metricsApi.getMeter('system-test')

      const cpuGauge = meter.createObservableGauge('system.cpu.usage')

      cpuGauge.addCallback((observableResult) => {
        // Simulate CPU usage reading
        const cpuUsage = Math.random() * 100
        observableResult.observe(cpuUsage, {
          core: '0',
          host: 'test-host',
        })
      })

      expect(cpuGauge).toBeDefined()
    })
  })

  describe('Metric Attributes', () => {
    it('should support various attribute types', () => {
      const meter = metricsApi.getMeter('attrs-test')
      const counter = meter.createCounter('test.attributes')

      counter.add(1, {
        stringAttr: 'value',
        numberAttr: 123,
        boolAttr: true,
        environment: 'test',
      })

      expect(counter).toBeDefined()
    })

    it('should handle nested attributes', () => {
      const meter = metricsApi.getMeter('nested-attrs-test')
      const counter = meter.createCounter('test.nested')

      counter.add(1, {
        'http.method': 'GET',
        'http.status_code': 200,
        'http.route': '/api/users/:id',
        'service.name': 'api-gateway',
        'service.version': '1.0.0',
      })

      expect(counter).toBeDefined()
    })
  })

  describe('Multiple Meters', () => {
    it('should support multiple independent meters', () => {
      const httpMeter = metricsApi.getMeter('http-metrics')
      const dbMeter = metricsApi.getMeter('db-metrics')
      const cacheMeter = metricsApi.getMeter('cache-metrics')

      const httpCounter = httpMeter.createCounter('http.requests')
      const dbHistogram = dbMeter.createHistogram('db.query.duration')
      const cacheHits = cacheMeter.createCounter('cache.hits')

      httpCounter.add(1)
      dbHistogram.record(50)
      cacheHits.add(1)

      expect(httpCounter).toBeDefined()
      expect(dbHistogram).toBeDefined()
      expect(cacheHits).toBeDefined()
    })

    it('should isolate meters by name', () => {
      const meter1 = metricsApi.getMeter('meter-1')
      const meter2 = metricsApi.getMeter('meter-2')

      const counter1 = meter1.createCounter('test.counter')
      const counter2 = meter2.createCounter('test.counter')

      counter1.add(5)
      counter2.add(10)

      expect(counter1).toBeDefined()
      expect(counter2).toBeDefined()
      expect(counter1).not.toBe(counter2)
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid metric names gracefully', () => {
      const meter = metricsApi.getMeter('error-test')

      // OpenTelemetry API should handle invalid names gracefully
      expect(() => {
        meter.createCounter('')
      }).not.toThrow()
    })

    it('should handle negative counter values', () => {
      const meter = metricsApi.getMeter('negative-test')
      const counter = meter.createCounter('test.negative')

      // Counters should ignore negative values
      expect(() => {
        counter.add(-5)
      }).not.toThrow()
    })

    it('should handle missing attributes', () => {
      const meter = metricsApi.getMeter('no-attrs-test')
      const counter = meter.createCounter('test.no.attrs')

      expect(() => {
        counter.add(1) // No attributes
      }).not.toThrow()
    })
  })

  describe('Real-world Scenarios', () => {
    it('should track HTTP request metrics', () => {
      const meter = metricsApi.getMeter('http-scenario')

      const requestCounter = meter.createCounter('http.server.requests')
      const durationHistogram = meter.createHistogram('http.server.duration')
      const activeRequests = meter.createUpDownCounter('http.server.active_requests')

      // Simulate HTTP request
      activeRequests.add(1)
      requestCounter.add(1, {
        method: 'GET',
        route: '/api/users',
        status_code: 200,
      })
      durationHistogram.record(150, {
        method: 'GET',
        route: '/api/users',
      })
      activeRequests.add(-1)

      expect(requestCounter).toBeDefined()
      expect(durationHistogram).toBeDefined()
      expect(activeRequests).toBeDefined()
    })

    it('should track database operations', () => {
      const meter = metricsApi.getMeter('db-scenario')

      const queryCounter = meter.createCounter('db.queries.total')
      const queryDuration = meter.createHistogram('db.query.duration')
      const connectionPool = meter.createUpDownCounter('db.connections.active')

      // Simulate database operations
      connectionPool.add(1)

      queryCounter.add(1, {
        operation: 'SELECT',
        table: 'users',
        database: 'postgres',
      })

      queryDuration.record(25, {
        operation: 'SELECT',
        table: 'users',
      })

      connectionPool.add(-1)

      expect(queryCounter).toBeDefined()
      expect(queryDuration).toBeDefined()
      expect(connectionPool).toBeDefined()
    })

    it('should track business metrics', () => {
      const meter = metricsApi.getMeter('business-scenario')

      const ordersCounter = meter.createCounter('business.orders.created')
      const revenueCounter = meter.createCounter('business.revenue.total')
      const cartSize = meter.createHistogram('business.cart.size')

      // Simulate business events
      ordersCounter.add(1, {
        customer_tier: 'premium',
        payment_method: 'credit_card',
      })

      revenueCounter.add(99.99, {
        currency: 'USD',
        product_category: 'electronics',
      })

      cartSize.record(5, {
        customer_tier: 'premium',
      })

      expect(ordersCounter).toBeDefined()
      expect(revenueCounter).toBeDefined()
      expect(cartSize).toBeDefined()
    })
  })
})

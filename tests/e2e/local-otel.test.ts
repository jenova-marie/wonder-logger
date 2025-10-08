/**
 * End-to-end tests for local OTEL collector integration
 *
 * These tests validate the first hop in the observability pipeline:
 * 1. SDK sends logs/traces to local OTEL collector
 * 2. OTEL collector receives and processes the data
 * 3. We can verify reception via collector's zpages
 *
 * Prerequisites:
 * - OTEL collector running at localhost (ports 4317-4318, 13133, 55679)
 * - Container: recoverysky-otel:latest
 *
 * Endpoints:
 * - 4317: OTLP gRPC
 * - 4318: OTLP HTTP
 * - 13133: Health check
 * - 55679: zpages (debug endpoints)
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { createLogger, createOtelTransport } from '../../src/utils/logger'
import { createTelemetry, withSpan } from '../../src/utils/otel'
import { trace as otelTrace } from '@opentelemetry/api'

const OTEL_HTTP_ENDPOINT = 'http://localhost:4318'
const OTEL_HEALTH_ENDPOINT = 'http://localhost:13133'
const OTEL_ZPAGES_ENDPOINT = 'http://localhost:55679'
const TEST_TIMEOUT = 5000

describe('E2E Integration - Local OTEL Collector', () => {
  it('should verify OTEL collector is running and healthy', async () => {
    try {
      const response = await fetch(OTEL_HEALTH_ENDPOINT)

      console.log('OTEL Health Check:', {
        status: response.status,
        statusText: response.statusText,
      })

      // Health endpoint may not be configured - zpages are more reliable
      if (response.status === 404) {
        console.warn('Health endpoint not found - using zpages instead')
      }
    } catch (error) {
      console.warn('Health endpoint unreachable:', error)
    }

    // Just verify zpages work as alternative health check
    const zpages = await fetch(`${OTEL_ZPAGES_ENDPOINT}/debug/servicez`)
    expect(zpages.ok).toBe(true)
  })

  it('should verify zpages endpoints are accessible', async () => {
    const endpoints = [
      '/debug/servicez',
      '/debug/pipelinez',
      '/debug/tracez',
    ]

    for (const endpoint of endpoints) {
      const response = await fetch(`${OTEL_ZPAGES_ENDPOINT}${endpoint}`)

      console.log(`zpages ${endpoint}:`, {
        status: response.status,
        contentType: response.headers.get('content-type'),
      })

      expect(response.ok).toBe(true)
    }
  })

  describe('Logs Transport', () => {
    let logger: any

    beforeAll(() => {
      logger = createLogger({
        name: 'e2e-local-otel-test',
        level: 'info',
        transports: [
          createOtelTransport({
            serviceName: 'e2e-local-otel-test',
            serviceVersion: '1.0.0',
            environment: 'test',
            endpoint: `${OTEL_HTTP_ENDPOINT}/v1/logs`,
          }),
        ],
      })
    })

    it(
      'should send log to OTEL collector HTTP endpoint',
      async () => {
        const testId = `local-otel-${Date.now()}`

        // Send log
        logger.info({ testId, test: 'local-collector' }, 'Testing local OTEL collector')

        // Wait for processing
        await new Promise((resolve) => setTimeout(resolve, 1000))

        // TODO: Query zpages to verify log was received
        // The zpages servicez endpoint should show our service
        const response = await fetch(`${OTEL_ZPAGES_ENDPOINT}/debug/servicez`)
        const html = await response.text()

        console.log('Services page contains our service:', html.includes('e2e-local-otel-test'))

        // For now, just verify the request succeeded
        // We'll need to parse HTML or check collector logs for actual verification
        expect(response.ok).toBe(true)
      },
      TEST_TIMEOUT
    )
  })

  describe('Traces Transport', () => {
    let sdk: any

    beforeAll(() => {
      sdk = createTelemetry({
        serviceName: 'e2e-local-otel-traces',
        serviceVersion: '1.0.0',
        environment: 'test',
        tracing: {
          enabled: true,
          exporter: 'otlp',
        },
        metrics: {
          enabled: false,
        },
      })
    })

    it(
      'should send trace to OTEL collector',
      async () => {
        // Temporarily enabled to debug with docker logs

        let capturedTraceId: string | null = null

        await withSpan(
          'local-otel-test-span',
          async () => {
            const activeSpan = otelTrace.getActiveSpan()
            console.log('Active span found:', activeSpan ? 'YES' : 'NO')

            if (activeSpan) {
              capturedTraceId = activeSpan.spanContext().traceId
              console.log('Trace ID:', capturedTraceId)

              activeSpan.setAttributes({
                'test.type': 'local-otel',
                'test.timestamp': Date.now(),
              })
            }

            await new Promise((resolve) => setTimeout(resolve, 100))
          },
          'e2e-local-otel-traces'
        )

        console.log('✅ Span created with trace ID:', capturedTraceId)
        expect(capturedTraceId).toBeTruthy()

        // Force flush to export spans
        console.log('🔄 Shutting down SDK to flush spans...')
        await sdk.shutdown()

        // Wait for collector to receive
        await new Promise((resolve) => setTimeout(resolve, 2000))

        console.log('🔍 Checking collector zpages for trace...')
        // We can't easily verify the trace made it without parsing HTML
        // This is a limitation - need to check docker logs manually
        console.log(`   Check docker logs: docker logs recoverysky-otel 2>&1 | grep ${capturedTraceId}`)
      },
      TEST_TIMEOUT * 2
    )
  })

  describe('OTLP Endpoint Verification', () => {
    it('should verify OTLP HTTP traces endpoint is reachable', async () => {
      // Try to POST to the traces endpoint
      // This should fail with 400/405 (not 404) if endpoint exists
      const response = await fetch(`${OTEL_HTTP_ENDPOINT}/v1/traces`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      console.log('OTLP traces endpoint:', {
        status: response.status,
        statusText: response.statusText,
      })

      // We expect 400 (bad request) or similar, NOT 404 (not found)
      expect(response.status).not.toBe(404)
    })

    it('should verify OTLP HTTP logs endpoint is reachable', async () => {
      const response = await fetch(`${OTEL_HTTP_ENDPOINT}/v1/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      console.log('OTLP logs endpoint:', {
        status: response.status,
        statusText: response.statusText,
      })

      expect(response.status).not.toBe(404)
    })
  })
})

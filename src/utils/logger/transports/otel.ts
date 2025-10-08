/**
 * OpenTelemetry Transport for Pino Logger
 *
 * Provides OpenTelemetry Collector integration for log forwarding.
 *
 * @example
 * import { createOtelTransport } from './transports/otel'
 *
 * const transport = createOtelTransport({
 *   serviceName: 'api',
 *   serviceVersion: '1.0.0',
 *   endpoint: 'http://localhost:4318/v1/logs'
 * })
 *
 * @requires pino
 * @requires pino-opentelemetry-transport
 */

import pino from 'pino'

export interface OtelTransportOptions {
  /**
   * Service name for OTEL resource attributes
   */
  serviceName: string

  /**
   * Service version for OTEL resource attributes
   * @default '1.0.0'
   */
  serviceVersion?: string

  /**
   * Service instance ID for OTEL resource attributes
   * @default `${serviceName}-${process.pid}`
   */
  serviceInstanceId?: string

  /**
   * Environment name (development, staging, production, etc.)
   * @default process.env.NODE_ENV || 'development'
   */
  environment?: string

  /**
   * OTLP endpoint URL
   * @default process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT || 'http://localhost:4318/v1/logs'
   */
  endpoint?: string

  /**
   * Additional resource attributes
   */
  resourceAttributes?: Record<string, string | number | boolean>

  /**
   * Log level for this transport
   * @default 'info'
   */
  level?: pino.Level

  /**
   * Export interval in milliseconds
   * @default 5000
   */
  exportIntervalMillis?: number
}

/**
 * Creates an OpenTelemetry transport configuration for pino
 *
 * @param options - OTEL transport configuration
 * @returns Pino stream transport configuration
 */
export function createOtelTransport(
  options: OtelTransportOptions
): pino.StreamEntry {
  const {
    serviceName,
    serviceVersion = '1.0.0',
    serviceInstanceId = `${serviceName}-${process.pid}`,
    environment = process.env.NODE_ENV || 'development',
    endpoint = process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT || 'http://localhost:4318/v1/logs',
    resourceAttributes = {},
    level = 'info',
    exportIntervalMillis = 5000,
  } = options

  return {
    level,
    stream: pino.transport({
      target: 'pino-opentelemetry-transport',
      options: {
        resourceAttributes: {
          'service.name': serviceName,
          'service.version': serviceVersion,
          'service.instance.id': serviceInstanceId,
          environment,
          ...resourceAttributes,
        },
        loggerName: `${serviceName}-logger`,
        endpoint,
        exportIntervalMillis,
      },
    }),
  }
}

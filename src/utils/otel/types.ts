/**
 * Core OpenTelemetry configuration types
 *
 * These types define the public API for configuring telemetry in the application.
 */

/**
 * Main telemetry configuration options
 */
export interface TelemetryOptions {
  /** Name of the service */
  serviceName: string
  /** Version of the service (defaults to '0.0.0') */
  serviceVersion?: string
  /** Deployment environment (defaults to NODE_ENV or 'development') */
  environment?: string
  /** Tracing configuration */
  tracing?: TracingOptions
  /** Metrics configuration */
  metrics?: MetricsOptions
}

/**
 * Tracing configuration options
 */
export interface TracingOptions {
  /** Whether tracing is enabled (defaults to true) */
  enabled?: boolean
  /** Trace exporter type (defaults to 'console') */
  exporter?: 'console' | 'otlp' | 'jaeger'
  /** Sample rate for traces (0-1, defaults to 1) */
  sampleRate?: number
}

/**
 * Metrics configuration options
 */
export interface MetricsOptions {
  /** Whether metrics are enabled (defaults to true) */
  enabled?: boolean
  /** Metrics exporter types (defaults to ['prometheus']) */
  exporters?: ('prometheus' | 'otlp')[]
  /** Port for Prometheus metrics endpoint (defaults to 9464) */
  port?: number
}

/**
 * Resource builder options
 */
export interface ResourceOptions {
  /** Name of the service */
  serviceName: string
  /** Version of the service */
  serviceVersion?: string
  /** Deployment environment */
  environment?: string
}

/**
 * Auto-instrumentation options
 */
export interface AutoInstrumentationOptions {
  /** Whether to include HTTP request/response hooks (defaults to false) */
  includeHttpHooks?: boolean
}

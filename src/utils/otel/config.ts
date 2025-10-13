/**
 * OpenTelemetry Configuration Integration
 *
 * Creates OpenTelemetry SDK instances from YAML config files.
 */

import { loadConfig } from '../config'
import type { OtelConfig, MetricsExporterConfig } from '../config/types'
import { createTelemetry } from './index'
import type { TelemetryOptions, TelemetrySDK } from './types'

/**
 * Options for createTelemetryFromConfig
 */
export interface CreateTelemetryFromConfigOptions {
  /**
   * Custom config file path
   * @default 'wonder-logger.yaml' in current directory
   */
  configPath?: string

  /**
   * Whether config file is required
   * @default true
   */
  required?: boolean

  /**
   * Runtime overrides for OTEL configuration
   */
  overrides?: Partial<TelemetryOptions>
}

/**
 * Builds metrics exporter configuration from config
 *
 * @param exportersConfig - Metrics exporters configuration
 * @returns Metrics options for createTelemetry
 */
function buildMetricsConfig(exportersConfig: MetricsExporterConfig[]) {
  // Determine exporter types
  const exporterTypes = exportersConfig.map((e) => e.type as 'prometheus' | 'otlp')

  // Get Prometheus port (use first found or default)
  const prometheusConfig = exportersConfig.find((e) => e.type === 'prometheus')
  const port = prometheusConfig && 'port' in prometheusConfig ? prometheusConfig.port : 9464

  // Get OTLP export interval (use first found or default)
  const otlpConfig = exportersConfig.find((e) => e.type === 'otlp')
  const exportIntervalMillis =
    otlpConfig && 'exportIntervalMillis' in otlpConfig
      ? otlpConfig.exportIntervalMillis
      : 60000

  return {
    exporters: exporterTypes,
    port,
    exportIntervalMillis,
  }
}

/**
 * Creates OpenTelemetry SDK from YAML config file
 *
 * @param options - Configuration options
 * @returns Configured OpenTelemetry SDK
 * @throws Error if config is required but not found, or if validation fails
 *
 * @example
 * ```typescript
 * // Load from default location (wonder-logger.yaml)
 * const sdk = createTelemetryFromConfig()
 *
 * // Load from custom path
 * const sdk = createTelemetryFromConfig({
 *   configPath: './config/otel.yaml'
 * })
 *
 * // With runtime overrides
 * const sdk = createTelemetryFromConfig({
 *   overrides: { environment: 'staging' }
 * })
 * ```
 */
export function createTelemetryFromConfig(
  options: CreateTelemetryFromConfigOptions = {}
): TelemetrySDK {
  const { configPath, required = true, overrides = {} } = options

  // Load config
  const config = loadConfig({ configPath, required })

  if (!config) {
    // Config not found and not required - use defaults
    return createTelemetry({
      serviceName: overrides.serviceName || 'default',
      serviceVersion: overrides.serviceVersion || '1.0.0',
      environment: overrides.environment || 'development',
      ...overrides,
    })
  }

  // Skip OTEL creation if disabled
  if (!config.otel.enabled) {
    throw new Error(
      'OpenTelemetry is disabled in config. Set otel.enabled to true or use programmatic API.'
    )
  }

  // Build telemetry options from config
  const telemetryOptions: TelemetryOptions = {
    serviceName: overrides.serviceName || config.service.name,
    serviceVersion: overrides.serviceVersion || config.service.version,
    environment: overrides.environment || config.service.environment,
    tracing: {
      enabled: config.otel.tracing.enabled,
      exporter: config.otel.tracing.exporter,
      sampleRate: config.otel.tracing.sampleRate,
    },
    metrics: {
      enabled: config.otel.metrics.enabled,
      ...buildMetricsConfig(config.otel.metrics.exporters),
    },
  }

  // Apply overrides
  if (overrides.tracing) {
    telemetryOptions.tracing = {
      ...telemetryOptions.tracing,
      ...overrides.tracing,
    }
  }

  if (overrides.metrics) {
    telemetryOptions.metrics = {
      ...telemetryOptions.metrics,
      ...overrides.metrics,
    }
  }

  return createTelemetry(telemetryOptions)
}

/**
 * Wonder Logger Configuration Module
 *
 * Provides YAML-based configuration with Zod validation and environment variable interpolation.
 *
 * @example
 * ```typescript
 * import { loadConfig } from './config'
 *
 * // Load from default location (wonder-logger.yaml)
 * const config = loadConfig()
 *
 * // Load from custom path
 * const config = loadConfig({ configPath: './config/custom.yaml' })
 * ```
 */

// Core functionality
export { loadConfig, loadConfigFromFile, findConfigFile, DEFAULT_CONFIG_FILE } from './loader.js'
export { parseYamlWithEnv, interpolateEnvVars, interpolateObject } from './parser.js'

// Schemas for advanced usage
export {
  configSchema,
  serviceSchema,
  loggerConfigSchema,
  otelConfigSchema,
  transportSchema,
  consoleTransportSchema,
  fileTransportSchema,
  otelTransportSchema,
  memoryTransportSchema,
  loggerPluginsSchema,
  tracingConfigSchema,
  metricsConfigSchema,
  metricsExporterSchema,
  prometheusExporterSchema,
  otlpMetricsExporterSchema,
  instrumentationConfigSchema,
} from './schema.js'

// Type exports
export type {
  WonderLoggerConfig,
  ServiceConfig,
  LoggerConfig,
  OtelConfig,
  TransportConfig,
  ConsoleTransportConfig,
  FileTransportConfig,
  OtelTransportConfig,
  MemoryTransportConfig,
  LoggerPluginsConfig,
  TracingConfig,
  MetricsConfig,
  MetricsExporterConfig,
  PrometheusExporterConfig,
  OtlpMetricsExporterConfig,
  InstrumentationConfig,
} from './types.js'

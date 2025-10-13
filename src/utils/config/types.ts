/**
 * Configuration Type Exports
 *
 * Re-exports all configuration types inferred from Zod schemas.
 */

export type {
  ServiceConfig,
  ConsoleTransportConfig,
  FileTransportConfig,
  OtelTransportConfig,
  TransportConfig,
  LoggerPluginsConfig,
  LoggerConfig,
  TracingConfig,
  PrometheusExporterConfig,
  OtlpMetricsExporterConfig,
  MetricsExporterConfig,
  MetricsConfig,
  InstrumentationConfig,
  OtelConfig,
  WonderLoggerConfig,
} from './schema.js'

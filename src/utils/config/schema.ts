/**
 * Zod Schemas for Wonder Logger Configuration
 *
 * Defines validation schemas for YAML config files.
 */

import { z } from 'zod'

/**
 * Service metadata schema
 */
export const serviceSchema = z.object({
  name: z.string().min(1, 'Service name is required'),
  version: z.string().default('1.0.0'),
  environment: z.string().default('development'),
})

/**
 * Logger transport schemas
 */
export const consoleTransportSchema = z.object({
  type: z.literal('console'),
  pretty: z.boolean().default(false),
  level: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).optional(),
  prettyOptions: z
    .object({
      colorize: z.boolean().optional(),
      translateTime: z.string().optional(),
      ignore: z.string().optional(),
      singleLine: z.boolean().optional(),
    })
    .optional(),
})

export const fileTransportSchema = z.object({
  type: z.literal('file'),
  dir: z.string().default('./logs'),
  fileName: z.string().default('app.log'),
  level: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).optional(),
  sync: z.boolean().default(false),
  mkdir: z.boolean().default(true),
})

export const otelTransportSchema = z.object({
  type: z.literal('otel'),
  endpoint: z.string().default('http://localhost:4318/v1/logs'),
  level: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).optional(),
  exportIntervalMillis: z.number().default(5000),
})

export const transportSchema = z.discriminatedUnion('type', [
  consoleTransportSchema,
  fileTransportSchema,
  otelTransportSchema,
])

/**
 * Logger plugins schema
 */
export const loggerPluginsSchema = z.object({
  traceContext: z.boolean().default(false),
  morganStream: z.boolean().default(false),
})

/**
 * Main logger configuration schema
 */
export const loggerConfigSchema = z.object({
  enabled: z.boolean().default(true),
  level: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent']).default('info'),
  redact: z.array(z.string()).default([]),
  transports: z.array(transportSchema).default([]),
  plugins: loggerPluginsSchema.optional().default({ traceContext: false, morganStream: false }),
})

/**
 * OpenTelemetry tracing schema
 */
export const tracingConfigSchema = z.object({
  enabled: z.boolean().default(true),
  exporter: z.enum(['console', 'otlp', 'jaeger']).default('console'),
  endpoint: z.string().optional(),
  sampleRate: z.number().min(0).max(1).default(1),
})

/**
 * OpenTelemetry metrics exporters schema
 */
export const prometheusExporterSchema = z.object({
  type: z.literal('prometheus'),
  port: z.number().default(9464),
})

export const otlpMetricsExporterSchema = z.object({
  type: z.literal('otlp'),
  endpoint: z.string().default('http://localhost:4318/v1/metrics'),
  exportIntervalMillis: z.number().default(60000),
})

export const metricsExporterSchema = z.discriminatedUnion('type', [
  prometheusExporterSchema,
  otlpMetricsExporterSchema,
])

/**
 * OpenTelemetry metrics schema
 */
export const metricsConfigSchema = z.object({
  enabled: z.boolean().default(true),
  exporters: z.array(metricsExporterSchema).default([]),
  exportIntervalMillis: z.number().default(60000),
})

/**
 * OpenTelemetry instrumentation schema
 */
export const instrumentationConfigSchema = z.object({
  auto: z.boolean().default(true),
  http: z.boolean().default(true),
})

/**
 * Main OpenTelemetry configuration schema
 */
export const otelConfigSchema = z.object({
  enabled: z.boolean().default(true),
  tracing: tracingConfigSchema.optional().default({ enabled: true, exporter: 'console', sampleRate: 1 }),
  metrics: metricsConfigSchema.optional().default({ enabled: true, exporters: [], exportIntervalMillis: 60000 }),
  instrumentation: instrumentationConfigSchema.optional().default({ auto: true, http: true }),
})

/**
 * Root configuration schema
 */
export const configSchema = z.object({
  service: serviceSchema,
  logger: loggerConfigSchema.optional().default({
    enabled: true,
    level: 'info',
    redact: [],
    transports: [],
    plugins: { traceContext: false, morganStream: false }
  }),
  otel: otelConfigSchema.optional().default({
    enabled: true,
    tracing: { enabled: true, exporter: 'console', sampleRate: 1 },
    metrics: { enabled: true, exporters: [], exportIntervalMillis: 60000 },
    instrumentation: { auto: true, http: true }
  }),
  /**
   * Internal metadata: directory containing the config file
   * Used to resolve relative paths. Not specified in YAML.
   */
  _configDir: z.string().optional(),
})

/**
 * Type exports inferred from schemas
 */
export type ServiceConfig = z.infer<typeof serviceSchema>
export type ConsoleTransportConfig = z.infer<typeof consoleTransportSchema>
export type FileTransportConfig = z.infer<typeof fileTransportSchema>
export type OtelTransportConfig = z.infer<typeof otelTransportSchema>
export type TransportConfig = z.infer<typeof transportSchema>
export type LoggerPluginsConfig = z.infer<typeof loggerPluginsSchema>
export type LoggerConfig = z.infer<typeof loggerConfigSchema>
export type TracingConfig = z.infer<typeof tracingConfigSchema>
export type PrometheusExporterConfig = z.infer<typeof prometheusExporterSchema>
export type OtlpMetricsExporterConfig = z.infer<typeof otlpMetricsExporterSchema>
export type MetricsExporterConfig = z.infer<typeof metricsExporterSchema>
export type MetricsConfig = z.infer<typeof metricsConfigSchema>
export type InstrumentationConfig = z.infer<typeof instrumentationConfigSchema>
export type OtelConfig = z.infer<typeof otelConfigSchema>
export type WonderLoggerConfig = z.infer<typeof configSchema>

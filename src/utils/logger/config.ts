/**
 * Logger Configuration Integration
 *
 * Creates Pino logger instances from YAML config files.
 */

import pino from 'pino'
import { loadConfig } from '../config'
import type { LoggerConfig, TransportConfig } from '../config/types'
import { createLogger } from './index'
import { createConsoleTransport } from './transports/console'
import { createFileTransport } from './transports/file'
import { createOtelTransport } from './transports/otel'
import { withTraceContext } from './plugins/traceContext'

/**
 * Options for createLoggerFromConfig
 */
export interface CreateLoggerFromConfigOptions {
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
   * Runtime overrides for logger configuration
   */
  overrides?: {
    level?: pino.LevelWithSilent
    transports?: pino.StreamEntry[]
  }
}

/**
 * Builds a transport from config
 *
 * @param transportConfig - Transport configuration
 * @param serviceName - Service name for OTEL transport
 * @param serviceVersion - Service version for OTEL transport
 * @param environment - Environment name for OTEL transport
 * @returns Pino stream entry
 */
function buildTransport(
  transportConfig: TransportConfig,
  serviceName: string,
  serviceVersion: string,
  environment: string
): pino.StreamEntry {
  switch (transportConfig.type) {
    case 'console':
      return createConsoleTransport({
        pretty: transportConfig.pretty,
        level: transportConfig.level,
        prettyOptions: transportConfig.prettyOptions,
      })

    case 'file':
      return createFileTransport({
        dir: transportConfig.dir,
        fileName: transportConfig.fileName,
        level: transportConfig.level,
        sync: transportConfig.sync,
        mkdir: transportConfig.mkdir,
      })

    case 'otel':
      return createOtelTransport({
        serviceName,
        serviceVersion,
        environment,
        endpoint: transportConfig.endpoint,
        level: transportConfig.level,
        exportIntervalMillis: transportConfig.exportIntervalMillis,
      })

    default:
      // TypeScript should prevent this, but just in case
      throw new Error(`Unknown transport type: ${(transportConfig as any).type}`)
  }
}

/**
 * Creates a logger from YAML config file
 *
 * @param options - Configuration options
 * @returns Configured Pino logger
 * @throws Error if config is required but not found, or if validation fails
 *
 * @example
 * ```typescript
 * // Load from default location (wonder-logger.yaml)
 * const logger = createLoggerFromConfig()
 *
 * // Load from custom path
 * const logger = createLoggerFromConfig({
 *   configPath: './config/logger.yaml'
 * })
 *
 * // With runtime overrides
 * const logger = createLoggerFromConfig({
 *   overrides: { level: 'debug' }
 * })
 * ```
 */
export function createLoggerFromConfig(
  options: CreateLoggerFromConfigOptions = {}
): pino.Logger {
  const { configPath, required = true, overrides = {} } = options

  // Load config
  const config = loadConfig({ configPath, required })

  if (!config) {
    // Config not found and not required - use defaults
    return createLogger({
      name: 'default',
      level: overrides.level || 'info',
      transports: overrides.transports,
    })
  }

  // Skip logger creation if disabled
  if (!config.logger.enabled) {
    throw new Error(
      'Logger is disabled in config. Set logger.enabled to true or use programmatic API.'
    )
  }

  // Build transports from config
  const transports =
    overrides.transports ||
    config.logger.transports.map((t) =>
      buildTransport(t, config.service.name, config.service.version, config.service.environment)
    )

  // If no transports configured, use console as default
  if (transports.length === 0) {
    transports.push(createConsoleTransport({ pretty: false }))
  }

  // Create base logger
  let logger = createLogger({
    name: config.service.name,
    level: overrides.level || config.logger.level,
    transports,
    base: {
      environment: config.service.environment,
      version: config.service.version,
    },
  })

  // Apply plugins
  if (config.logger.plugins.traceContext) {
    logger = withTraceContext(logger)
  }

  return logger
}

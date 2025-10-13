/**
 * Wonder Logger - Production-ready observability toolkit
 *
 * Combines OpenTelemetry instrumentation with structured Pino logging
 * for comprehensive Node.js application observability.
 *
 * @packageDocumentation
 */

// ============================================================================
// Logger Imports (for default export)
// ============================================================================

import { createLogger } from "./utils/logger/index";
import { createConsoleTransport } from "./utils/logger/transports/console";
import { createFileTransport } from "./utils/logger/transports/file";
import { createOtelTransport } from "./utils/logger/transports/otel";
import { createMemoryTransport } from "./utils/logger/transports/memory";
import { withTraceContext } from "./utils/logger/plugins/traceContext";
import { createMorganStream } from "./utils/logger/plugins/morganStream";
import { createLoggerFromConfig } from "./utils/logger/config";
import { createTelemetry } from "./utils/otel/index";
import { withSpan } from "./utils/otel/utils/withSpan";
import { createTelemetryFromConfig } from "./utils/otel/config";
import { loadConfig } from "./utils/config";

// ============================================================================
// Logger Exports
// ============================================================================

export { createLogger, type LoggerOptions } from "./utils/logger/index";

// Logger Transports
export {
  createConsoleTransport,
  type ConsoleTransportOptions,
} from "./utils/logger/transports/console";

export {
  createFileTransport,
  type FileTransportOptions,
} from "./utils/logger/transports/file";

export {
  createOtelTransport,
  type OtelTransportOptions,
} from "./utils/logger/transports/otel";

export {
  createMemoryTransport,
  getMemoryLogs,
  clearMemoryLogs,
  getMemoryLogSize,
  getAllMemoryStoreNames,
  getMemoryLogStream,
  filterByLevel,
  filterSince,
  withBackpressure,
  disposeMemoryStore,
  type MemoryTransportOptions,
  type MemoryQueryOptions,
  type RawLogEntry,
  type ParsedLogEntry,
  type BackpressureOptions,
} from "./utils/logger/transports/memory";

// Logger Plugins
export { withTraceContext } from "./utils/logger/plugins/traceContext";

export { createMorganStream } from "./utils/logger/plugins/morganStream";

// Logger Config-Driven Factory
export {
  createLoggerFromConfig,
  type CreateLoggerFromConfigOptions,
} from "./utils/logger/config";

// ============================================================================
// OpenTelemetry Exports
// ============================================================================

export {
  createTelemetry,
  type TelemetryOptions,
  type TracingOptions,
  type MetricsOptions,
  type TelemetrySDK,
} from "./utils/otel/index";

export { withSpan } from "./utils/otel/utils/withSpan";

// OpenTelemetry Config-Driven Factory
export {
  createTelemetryFromConfig,
  type CreateTelemetryFromConfigOptions,
} from "./utils/otel/config";

// ============================================================================
// Configuration Module
// ============================================================================

export {
  loadConfig,
  loadConfigFromFile,
  findConfigFile,
  DEFAULT_CONFIG_FILE,
  type WonderLoggerConfig,
  type ServiceConfig,
  type LoggerConfig,
  type OtelConfig,
  type TransportConfig,
  type ConsoleTransportConfig,
  type FileTransportConfig,
  type OtelTransportConfig as OtelTransportConfig_Config,
  type LoggerPluginsConfig,
  type TracingConfig,
  type MetricsConfig,
  type MetricsExporterConfig,
  type PrometheusExporterConfig,
  type OtlpMetricsExporterConfig,
  type InstrumentationConfig,
} from "./utils/config";

// ============================================================================
// Default Export
// ============================================================================

export default {
  // Programmatic API
  createLogger,
  createConsoleTransport,
  createFileTransport,
  createOtelTransport,
  createMemoryTransport,
  withTraceContext,
  createMorganStream,
  createTelemetry,
  withSpan,
  // Config-driven API
  createLoggerFromConfig,
  createTelemetryFromConfig,
  loadConfig,
};

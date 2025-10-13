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

import { createLogger } from "./utils/logger/index.js";
import { createConsoleTransport } from "./utils/logger/transports/console.js";
import { createFileTransport } from "./utils/logger/transports/file.js";
import { createOtelTransport } from "./utils/logger/transports/otel.js";
import { createMemoryTransport } from "./utils/logger/transports/memory.js";
import { withTraceContext } from "./utils/logger/plugins/traceContext.js";
import { createMorganStream } from "./utils/logger/plugins/morganStream.js";
import { createLoggerFromConfig } from "./utils/logger/config.js";
import { createTelemetry } from "./utils/otel/index.js";
import { withSpan } from "./utils/otel/utils/withSpan.js";
import { createTelemetryFromConfig } from "./utils/otel/config.js";
import { loadConfig } from "./utils/config/index.js";

// ============================================================================
// Logger Exports
// ============================================================================

export { createLogger, type LoggerOptions } from "./utils/logger/index.js";

// Logger Transports
export {
  createConsoleTransport,
  type ConsoleTransportOptions,
} from "./utils/logger/transports/console.js";

export {
  createFileTransport,
  type FileTransportOptions,
} from "./utils/logger/transports/file.js";

export {
  createOtelTransport,
  type OtelTransportOptions,
} from "./utils/logger/transports/otel.js";

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
} from "./utils/logger/transports/memory.js";

// Logger Plugins
export { withTraceContext } from "./utils/logger/plugins/traceContext.js";

export { createMorganStream } from "./utils/logger/plugins/morganStream.js";

// Logger Config-Driven Factory
export {
  createLoggerFromConfig,
  type CreateLoggerFromConfigOptions,
} from "./utils/logger/config.js";

// ============================================================================
// OpenTelemetry Exports
// ============================================================================

export {
  createTelemetry,
  type TelemetryOptions,
  type TracingOptions,
  type MetricsOptions,
  type TelemetrySDK,
} from "./utils/otel/index.js";

export { withSpan } from "./utils/otel/utils/withSpan.js";

// OpenTelemetry Config-Driven Factory
export {
  createTelemetryFromConfig,
  type CreateTelemetryFromConfigOptions,
} from "./utils/otel/config.js";

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
} from "./utils/config/index.js";

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

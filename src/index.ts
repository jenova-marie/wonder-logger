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
import { createTelemetry } from "./utils/otel/index";
import { withSpan } from "./utils/otel/utils/withSpan";

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
  type MemoryTransportOptions,
  type MemoryQueryOptions,
  type RawLogEntry,
  type ParsedLogEntry,
} from "./utils/logger/transports/memory";

// Logger Plugins
export { withTraceContext } from "./utils/logger/plugins/traceContext";

export { createMorganStream } from "./utils/logger/plugins/morganStream";

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

// ============================================================================
// Default Export
// ============================================================================

export default {
  createLogger,
  createConsoleTransport,
  createFileTransport,
  createOtelTransport,
  createMemoryTransport,
  withTraceContext,
  createMorganStream,
  createTelemetry,
  withSpan,
};

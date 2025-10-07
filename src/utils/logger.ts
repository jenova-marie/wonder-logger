/**
 * RecoverySky Logger - Pino-based logging with Loki, Console, and File transports
 *
 * Features:
 * - Structured JSON logging with Pino
 * - Multiple transports: Console (pretty in dev), OTEL Collector (remote), File (optional)
 * - Environment-based configuration
 * - Morgan HTTP request logging compatibility
 * - Child logger support for request scoping
 *
 * @example Basic Usage
 * import RecoverySkyLogger from './logger';
 * const logger = new RecoverySkyLogger({ logName: 'api' });
 *
 * logger.info({ userId: 123 }, 'User logged in');
 * logger.error({ error: err.message, stack: err.stack }, 'Database error');
 *
 * @example HTTP Request Logging
 * const httpLogger = new RecoverySkyLogger({ logName: 'http' });
 * app.use(morgan('combined', { stream: httpLogger.stream }));
 *
 * @example Child Logger for Request Scoping
 * const requestLogger = logger.child({ requestId: req.id, userId: req.user.id });
 * requestLogger.info('Processing user request');
 *
 * @requires - This module requires Pino logging packages:
 * pnpm add pino pino-opentelemetry-transport
 * pnpm add -D pino-pretty
 *
 * Optional dependency for trace correlation:
 * pnpm add @opentelemetry/api
 */

import pino from "pino";
import path from "path";
import fs from "fs";

// Try to load OpenTelemetry API at module level (optional dependency)
let otelTrace: any = null;
(async () => {
  try {
    const otelApi = await import("@opentelemetry/api");
    otelTrace = otelApi.trace;
  } catch {
    // OpenTelemetry not installed - that's okay
  }
})();

interface LoggerOptions {
  logName?: string;
  enableFile?: boolean;
  enableConsole?: boolean;
  enableOtel?: boolean;
  level?: string;
  extraLabels?: Record<string, any>;
  [key: string]: any;
}

interface TraceContext {
  traceId?: string;
  spanId?: string;
  traceFlags?: string;
}

interface MorganStream {
  write: (message: string) => void;
}

/**
 * RecoverySky Logger Class
 *
 * @class RecoverySkyLogger
 * @param {Object} options - Logger configuration options
 * @param {string} [options.logName='default'] - Service/component name for log identification
 * @param {boolean} [options.enableFile=true] - Enable file logging transport
 * @param {boolean} [options.enableConsole=true] - Enable console logging transport
 * @param {boolean} [options.enableOtel=true] - Enable OTEL collector logging transport
 * @param {string} [options.level] - Log level (trace, debug, info, warn, error, fatal)
 */
class RecoverySkyLogger {
  private options: LoggerOptions;
  private transports: any[];
  private logger: pino.Logger;
  public stream: MorganStream;

  constructor(options: LoggerOptions = {}) {
    this.options = {
      logName: options.logName || "default",
      enableFile: options.enableFile !== false,
      enableConsole: options.enableConsole !== false,
      enableOtel: options.enableOtel !== false,
      level: options.level || process.env.LOG_LEVEL || "info",
      ...options,
    };

    this.transports = [];
    this.setupTransports();

    this.logger = pino(
      {
        level: this.options.level,
        base: {
          application: "recoverysky-zoom",
          service: this.options.logName,
          environment: process.env.NODE_ENV || "development",
          ...(this.options.extraLabels || {}),
        },
      },
      pino.multistream(this.transports),
    );

    this.stream = { write: () => {} }; // Initialize
    this.setupMorganStream();
  }

  private setupTransports(): void {
    // Console transport
    if (this.options.enableConsole) {
      const consoleTransport = {
        level:
          process.env.NODE_ENV === "development" ? "debug" : this.options.level,
        stream:
          process.env.NODE_ENV === "development"
            ? pino.transport({
                target: "pino-pretty",
                options: {
                  colorize: true,
                  translateTime: "yyyy-mm-dd HH:MM:ss",
                  ignore: "pid,hostname",
                },
              })
            : process.stdout,
      };
      this.transports.push(consoleTransport);
    }

    // OTEL Collector transport
    if (this.options.enableOtel && this.shouldUseOtel()) {
      const otelTransport = {
        level: this.options.level,
        stream: pino.transport({
          target: "pino-opentelemetry-transport",
          options: {
            resourceAttributes: {
              "service.name":
                process.env.OTEL_SERVICE_NAME || "recoverysky-zoom-api",
              "service.version": process.env.OTEL_SERVICE_VERSION || "1.0.0",
              "service.instance.id": `${this.options.logName}-${process.pid}`,
              environment: process.env.NODE_ENV || "development",
            },
            loggerName: `${this.options.logName}-logger`,
          },
        }),
      };
      this.transports.push(otelTransport);
    }

    // File transport
    if (this.options.enableFile && process.env.LOG_FILE_ENABLED !== "false") {
      this.ensureLogDirectory();
      const logFilePath = this.getLogFilePath();
      const fileTransport = {
        level: this.options.level,
        stream: pino.destination({
          dest: logFilePath,
          sync: false,
          mkdir: true,
        }),
      };
      this.transports.push(fileTransport);
    }
  }

  private shouldUseOtel(): boolean {
    // Skip the test environment check if TEST_ENABLE_OTEL is true
    if (
      process.env.NODE_ENV === "test" &&
      process.env.TEST_ENABLE_OTEL !== "true"
    ) {
      return false;
    }

    if (process.env.OTEL_LOG_EXPORTER !== "otlp") {
      return false;
    }

    if (process.env.OTEL_SDK_DISABLED === "true") {
      return false;
    }

    if (!process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT) {
      return false;
    }

    return true;
  }

  private ensureLogDirectory(): void {
    const logDir = process.env.LOG_FILE_DIR || "./logs";
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  private getLogFilePath(): string {
    const logDir = process.env.LOG_FILE_DIR || "./logs";
    const fileName = `${this.options.logName}.log`;
    return path.join(logDir, fileName);
  }

  private setupMorganStream(): void {
    this.stream = {
      write: (message: string) => {
        const cleanMessage = message.replace(/\n$/, "");
        this.logger.info(cleanMessage);
      },
    };
  }

  /**
   * Get current OpenTelemetry trace context for correlation
   * @returns {Object} Trace context object with traceId, spanId, traceFlags
   */
  private getTraceContext(): TraceContext {
    if (!otelTrace) {
      return {};
    }

    try {
      const currentSpan = otelTrace.getActiveSpan();

      if (currentSpan) {
        const { traceId, spanId, traceFlags } = currentSpan.spanContext();
        return {
          traceId,
          spanId,
          traceFlags: traceFlags.toString(),
        };
      }
    } catch (error) {
      // Error getting active span
    }
    return {};
  }

  // Pino native methods
  /**
   * Log info level message
   * @param {Object|string} obj - Log data object or message string
   * @param {string} [msg] - Message string when first param is object
   * @example
   * logger.info('Simple message');
   * logger.info({ userId: 123 }, 'User action completed');
   */
  info(obj: any, msg?: string, ...args: any[]): void {
    if (
      typeof obj === "object" &&
      obj !== null &&
      process.env.OTEL_TRACE_CORRELATION === "true"
    ) {
      obj = { ...obj, ...this.getTraceContext() };
    }
    return this.logger.info(obj, msg, ...args);
  }

  /**
   * Log error level message
   * @param {Object|string} obj - Log data object or message string
   * @param {string} [msg] - Message string when first param is object
   * @example
   * logger.error('Something went wrong');
   * logger.error({ error: err.message, stack: err.stack }, 'Database connection failed');
   */
  error(obj: any, msg?: string, ...args: any[]): void {
    if (
      typeof obj === "object" &&
      obj !== null &&
      process.env.OTEL_TRACE_CORRELATION === "true"
    ) {
      obj = { ...obj, ...this.getTraceContext() };
    }
    return this.logger.error(obj, msg, ...args);
  }

  /**
   * Log warning level message
   * @param {Object|string} obj - Log data object or message string
   * @param {string} [msg] - Message string when first param is object
   */
  warn(obj: any, msg?: string, ...args: any[]): void {
    return this.logger.warn(obj, msg, ...args);
  }

  /**
   * Log debug level message
   * @param {Object|string} obj - Log data object or message string
   * @param {string} [msg] - Message string when first param is object
   */
  debug(obj: any, msg?: string, ...args: any[]): void {
    return this.logger.debug(obj, msg, ...args);
  }

  /**
   * Log trace level message (most verbose)
   * @param {Object|string} obj - Log data object or message string
   * @param {string} [msg] - Message string when first param is object
   */
  trace(obj: any, msg?: string, ...args: any[]): void {
    return this.logger.trace(obj, msg, ...args);
  }

  /**
   * Log fatal level message (highest priority)
   * @param {Object|string} obj - Log data object or message string
   * @param {string} [msg] - Message string when first param is object
   */
  fatal(obj: any, msg?: string, ...args: any[]): void {
    return this.logger.fatal(obj, msg, ...args);
  }

  /**
   * Create child logger with additional context
   * @param {Object} bindings - Additional context to include in all child logs
   * @returns {Object} Child logger instance with same methods
   * @example
   * const requestLogger = logger.child({ requestId: 'req-123', userId: 456 });
   * requestLogger.info('Processing request'); // Will include requestId and userId
   */
  child(bindings: Record<string, any>): any {
    const childLogger = this.logger.child(bindings);
    (childLogger as any).stream = this.stream;
    return childLogger;
  }

  /**
   * Flush all pending log writes
   */
  flush(): void {
    if ((this.logger as any).flush) {
      (this.logger as any).flush();
    }
  }
}

// Export the class as default
export default RecoverySkyLogger;

// Export convenience instances for backward compatibility
// For the gabby-api project, we use a simple pino logger without the RecoverySky features
// This avoids the complexity of the multistream setup and makes it work reliably in all environments

// Initialize logger synchronously at module load time
const logger: pino.Logger = pino({
  name: "gabby-api",
  level: process.env.LOG_LEVEL || "info",
  base: {
    service: "gabby-api",
    environment: process.env.NODE_ENV || "development",
  },
});

const requestLogger = logger.child({ context: "http" });

function createLogger(context: Record<string, any>): pino.Logger {
  return logger.child(context);
}

export { logger, requestLogger, createLogger };

/**
 * ENVIRONMENT VARIABLES
 *
 * Optional Logging:
 * - LOG_LEVEL: Minimum log level (trace, debug, info, warn, error, fatal) [default: 'info']
 * - LOG_FILE_ENABLED: Enable file logging [default: true]
 * - LOG_FILE_DIR: Directory for log files [default: './logs']
 *
 * OpenTelemetry Integration:
 * - OTEL_TRACE_CORRELATION: Auto-include trace context in logs [default: false]
 * - OTEL_LOG_EXPORTER: Log exporter type ('otlp' for OTEL collector) [default: none]
 * - OTEL_EXPORTER_OTLP_LOGS_ENDPOINT: OTEL collector logs endpoint [default: 'http://localhost:4318/v1/logs']
 * - OTEL_LOG_EXPORT_INTERVAL: Log export interval in ms [default: 5000]
 * - OTEL_SERVICE_NAME: Service name for OTEL resource attributes
 * - OTEL_SERVICE_VERSION: Service version for OTEL resource attributes
 *
 * USAGE PATTERNS
 *
 * 1. Basic Application Logging:
 * ```typescript
 * const logger = new RecoverySkyLogger({ logName: 'api' });
 * logger.info({ userId: 123, action: 'login' }, 'User logged in');
 * logger.error({ error: err.message, stack: err.stack }, 'Database error');
 * ```
 *
 * 2. HTTP Request Logging (separate from app logs):
 * ```typescript
 * const httpLogger = new RecoverySkyLogger({ logName: 'http' });
 * app.use(morgan('combined', { stream: httpLogger.stream }));
 * ```
 *
 * 3. Request-Scoped Logging:
 * ```typescript
 * app.use((req, res, next) => {
 *   req.logger = logger.child({
 *     requestId: req.id,
 *     userId: req.user?.id,
 *     userAgent: req.headers['user-agent']
 *   });
 *   next();
 * });
 *
 * // In route handlers:
 * req.logger.info({ productId: 456 }, 'Product purchased');
 * ```
 *
 * 4. Different Loggers for Different Components:
 * ```typescript
 * const authLogger = new RecoverySkyLogger({ logName: 'auth' });
 * const dbLogger = new RecoverySkyLogger({ logName: 'database' });
 * const cacheLogger = new RecoverySkyLogger({ logName: 'redis' });
 * ```
 *
 * 5. OpenTelemetry Log Export:
 * ```typescript
 * // With OTEL_LOG_EXPORTER=otlp
 * const logger = new RecoverySkyLogger({ logName: 'api' });
 * logger.info({ userId: 123, action: 'purchase' }, 'User action');
 * // Logs are sent to OTEL collector, then forwarded to Loki
 * ```
 *
 * 6. OpenTelemetry Trace Correlation:
 * ```typescript
 * // With OTEL_TRACE_CORRELATION=true
 * logger.error({ error: err.message }, 'API error occurred');
 * // Automatically includes traceId, spanId, traceFlags if OpenTelemetry is active
 * ```
 *
 * TRANSPORT FLOW:
 * - Console: Direct to stdout/stderr (pretty printed in dev)
 * - File: Direct to log files in LOG_FILE_DIR
 * - OTEL: App → localhost:4318 OTEL Collector → loki.rso (via collector config)
 */

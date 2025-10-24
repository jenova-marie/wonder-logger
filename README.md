<div align="center">
  <img src="./logo.png" alt="Wonder Logger Logo" width="200" />
  <h1>⭐Wonder Logger⭐</h1>
  <p><em>Production-ready observability toolkit combining OpenTelemetry instrumentation with structured Pino logging for Node.js applications</em></p>
</div>

<div align="center">

[![Build Status](https://github.com/jenova-marie/wonder-logger/actions/workflows/ci.yml/badge.svg)](https://github.com/jenova-marie/wonder-logger/actions/workflows/ci.yml)
[![codecov](https://codecov.io/github/jenova-marie/wonder-logger/graph/badge.svg?token=7GEHX9N0O2)](https://codecov.io/github/jenova-marie/wonder-logger)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![npm version](https://img.shields.io/npm/v/@recoverysky/wonder-logger.svg)](https://www.npmjs.com/package/@recoverysky/wonder-logger)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9+-blue.svg)](https://www.typescriptlang.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

</div>

---

## Overview

⭐Wonder Logger⭐ is a comprehensive observability solution that unifies structured logging and distributed tracing for Node.js applications. Built on industry-standard tools ([Pino](https://getpino.io/) and [OpenTelemetry](https://opentelemetry.io/)), it provides a clean, modular API for instrumenting your applications with production-grade observability.

### Key Features

- **Structured Logging** - Fast, JSON-based logging with [Pino](https://getpino.io/)
- **Distributed Tracing** - Full OpenTelemetry SDK integration with automatic instrumentation
- **Metrics Collection** - Prometheus and OTLP metrics exporters
- **Multiple Transports** - Console, file, OpenTelemetry, and in-memory transports
- **Trace Context Correlation** - Automatic injection of trace IDs into logs
- **Modular Architecture** - Composable transports and exporters
- **Zero Globals** - Factory pattern with no singleton state
- **Full TypeScript** - Complete type definitions included
- **Production Ready** - Battle-tested with 319 tests (unit + integration + E2E)

### Supported Backends

- **Grafana Loki** - Log aggregation
- **Grafana Tempo** - Distributed tracing
- **Jaeger** - Distributed tracing
- **Prometheus** - Metrics collection
- **Any OTLP-compatible backend** (Honeycomb, Datadog, etc.)

## Installation

```bash
npm install wonder-logger
```

```bash
yarn add wonder-logger
```

```bash
pnpm add wonder-logger
```

## 📚 Documentation

**Comprehensive guides for all features:**

- **[⚙️ Configuration Guide](./content/CONFIGURATION.md)** - **START HERE!** YAML configuration system
  - ⚠️ **Type Safety Warnings** - Critical info about environment variables with booleans/numbers
  - Complete schema reference for all configuration options
  - Environment variable interpolation syntax
  - Validation error troubleshooting with examples
  - Multi-environment setup

- **[📝 Structured Logging Guide](./src/utils/logger/README.md)** - Complete Pino logger documentation
  - Transports (console, file, OTEL, memory)
  - Plugins (trace context, Morgan HTTP logging)
  - RxJS streaming and real-time monitoring
  - Testing and best practices

- **[🔭 OpenTelemetry Guide](./src/utils/otel/README.md)** - Telemetry instrumentation and tracing
  - Trace exporters (console, OTLP, Jaeger)
  - Metrics exporters (Prometheus, OTLP)
  - Auto-instrumentation setup
  - Manual span instrumentation with `withSpan`

## Quick Start

⭐Wonder Logger⭐ uses **YAML-based configuration** for production deployments. For programmatic usage, see the [Configuration Guide](./src/utils/config/README.md#programmatic-api).

### For Web Servers (Long-Running Applications)

**1. Create `wonder-logger.yaml` in your project root:**

```yaml
service:
  name: ${SERVICE_NAME:-my-api}
  version: ${SERVICE_VERSION:-1.0.0}
  environment: ${NODE_ENV:-development}

logger:
  enabled: true  # ⚠️ Boolean literal (NOT ${LOGGER_ENABLED:-true})
  level: ${LOG_LEVEL:-info}
  redact:
    - password
    - token
  transports:
    # Console transport (JSON format in production)
    - type: console
      pretty: false  # ⚠️ Boolean literal (NOT ${LOG_PRETTY:-false})

    # File transport (async mode for better throughput)
    - type: file
      dir: ./logs
      fileName: app.log
      sync: false  # Async I/O for long-running processes

    # Memory transport (for testing and runtime log inspection)
    - type: memory
      name: ${SERVICE_NAME:-my-api}
      maxSize: 10000
      level: debug

    # OpenTelemetry transport (send to Loki, etc.)
    - type: otel
      endpoint: ${OTEL_LOGS_ENDPOINT:-http://localhost:4318/v1/logs}

  plugins:
    # Inject trace_id and span_id into logs
    traceContext: true

otel:
  enabled: true  # ⚠️ Boolean literal (NOT ${OTEL_ENABLED:-true})
  tracing:
    enabled: true
    exporter: ${OTEL_TRACE_EXPORTER:-otlp}
    endpoint: ${OTEL_TRACES_ENDPOINT:-http://localhost:4318/v1/traces}
    sampleRate: 1.0
  metrics:
    enabled: true
    exporters:
      - type: prometheus
        port: 9464  # ⚠️ Number literal (NOT ${PROMETHEUS_PORT:-9464})
      - type: otlp
        endpoint: ${OTEL_METRICS_ENDPOINT:-http://localhost:4318/v1/metrics}
        exportIntervalMillis: 60000
  instrumentation:
    auto: true
    http: true
```

### For CLI Tools (Quick-Exit Applications)

⚠️ **CRITICAL**: CLI applications require `sync: true` for file transports to prevent crashes and log loss when process exits quickly.

**1. Create `wonder-logger.yaml` in your project root:**

```yaml
service:
  name: ${SERVICE_NAME:-my-cli}
  version: ${SERVICE_VERSION:-1.0.0}
  environment: ${NODE_ENV:-development}

logger:
  enabled: true
  level: ${LOG_LEVEL:-info}
  transports:
    - type: console
      pretty: false

    # File transport - MUST use sync: true for CLI apps
    - type: file
      dir: ./logs
      fileName: cli.log
      sync: true  # ⚠️ REQUIRED - prevents "sonic boom is not ready" crashes

otel:
  enabled: false  # Typically disabled for CLI tools
```

**Why `sync: true`?** CLI apps often exit in <100ms (e.g., `--help`, validation errors), but async file transports take ~100-200ms to initialize. This race condition causes crashes. `sync: true` eliminates the race with only 4-5ms performance penalty.

See [Configuration Guide - Transport Configuration by Use Case](./content/CONFIGURATION.md#transport-configuration-by-use-case) for detailed recommendations.

**2. Load configuration in your application:**

```typescript
import { createLoggerFromConfig, createTelemetryFromConfig } from 'wonder-logger'

// Load from wonder-logger.yaml in project root
const sdk = createTelemetryFromConfig()
const logger = createLoggerFromConfig()

// Now start logging with full observability
logger.info('Application started')
logger.info({ userId: 123 }, 'User logged in')
```

**3. Query memory logs programmatically:**

```typescript
import { getMemoryLogs } from 'wonder-logger'

// Query logs from last 5 minutes
const recentLogs = getMemoryLogs('my-api', {
  since: Date.now() - 300000,
  level: ['error', 'warn'],
  format: 'parsed'
})

console.log(recentLogs)
```

**4. Environment variable syntax:**

```yaml
# Required variable (throws error if not set)
service:
  name: ${SERVICE_NAME}

# Optional variable with default
service:
  name: ${SERVICE_NAME:-my-api}
  version: ${npm_package_version:-1.0.0}
```

**For programmatic API usage**, see [Configuration Guide - Programmatic API](./src/utils/config/README.md#programmatic-api).

## API Usage

### Logging Methods - Parameter Order

⚠️ **IMPORTANT**: ⭐Wonder Logger⭐ uses [Pino](https://getpino.io/) for structured logging. **The data object MUST come BEFORE the message string**:

```typescript
// ✅ CORRECT - Data object first, then message
logger.info({ userId: 123 }, 'User logged in')
logger.debug({ endpoint: '/api/users' }, 'Processing request')
logger.error({ err, code: 'DB_ERROR' }, 'Database connection failed')

// ❌ INCORRECT - Message first (data will be lost!)
logger.info('User logged in', { userId: 123 })      // userId is NOT logged!
logger.debug('Processing request', { endpoint: '/api/users' })  // endpoint is NOT logged!
```

**Why this matters:** When you pass arguments in the wrong order, Pino treats the message string as the merge object and converts your data object to `"[object Object]"` in the message field. **Your structured data is completely lost**.

**API Signature:**
```typescript
logger.info([mergingObject], [message], [...interpolationValues])
logger.debug([mergingObject], [message], [...interpolationValues])
logger.error([mergingObject], [message], [...interpolationValues])
// All log levels follow this pattern
```

This applies to all log levels: `trace()`, `debug()`, `info()`, `warn()`, `error()`, and `fatal()`.

**Examples:**
```typescript
// Data object only (no message)
logger.info({ userId: 123, action: 'login' })

// Message only (no data)
logger.info('Server started')

// Data object + message (most common)
logger.info({ userId: 123 }, 'User logged in')

// Data object + message + interpolation
logger.info({ userId: 123 }, 'User %s logged in at %s', username, timestamp)

// Error logging (err is serialized automatically by Pino)
try {
  await riskyOperation()
} catch (err) {
  logger.error({ err, userId: 123 }, 'Operation failed')
}
```

## Configuration

### YAML-Based Configuration (Recommended)

⭐Wonder Logger⭐ uses **YAML configuration files** for production deployments, providing centralized configuration, environment variable interpolation, and easy multi-environment setup.

**Key benefits:**
- **Environment flexibility** - No code changes needed for different environments
- **Centralized settings** - All configuration in one place
- **Variable interpolation** - Use `${VAR_NAME}` or `${VAR_NAME:-default}` syntax
- **Validation** - Automatic schema validation with helpful error messages
- **Version control friendly** - Configuration as code

**Example:**
```yaml
# wonder-logger.yaml
service:
  name: ${SERVICE_NAME:-my-api}

logger:
  level: ${LOG_LEVEL:-info}
  transports:
    - type: console
      pretty: false
    - type: memory
      name: ${SERVICE_NAME}
      maxSize: 10000

otel:
  enabled: true
  tracing:
    exporter: otlp
    endpoint: ${OTEL_ENDPOINT}
```

```typescript
// Your application
import { createLoggerFromConfig, createTelemetryFromConfig } from 'wonder-logger'

const sdk = createTelemetryFromConfig()
const logger = createLoggerFromConfig()
```

See the complete [Configuration Guide](./src/utils/config/README.md) for:
- Full schema documentation
- Environment variable syntax
- Multi-environment setup
- [Programmatic API](./src/utils/config/README.md#programmatic-api) (for dynamic configuration)

## Architecture

```
wonder-logger/
├── Logger (Pino-based)
│   ├── Transports
│   │   ├── Console (with pretty printing)
│   │   ├── File (async I/O)
│   │   ├── OpenTelemetry (OTLP)
│   │   └── Memory (queryable in-memory store)
│   └── Plugins
│       ├── Trace Context (OTEL correlation)
│       └── Morgan Stream (HTTP request logging)
│
└── OpenTelemetry
    ├── Trace Exporters
    │   ├── Console
    │   ├── OTLP (Tempo, Jaeger, Honeycomb)
    │   └── Jaeger
    ├── Metrics Exporters
    │   ├── Prometheus (pull-based)
    │   └── OTLP (push-based)
    └── Auto-Instrumentation
        └── HTTP, Express, GraphQL, databases, etc.
```

## Documentation

### Core Modules

- [Structured Logging Guide](./src/utils/logger/README.md) - Complete logger documentation
- [OpenTelemetry Guide](./src/utils/otel/README.md) - Telemetry setup and configuration
- [Configuration Guide](./src/utils/config/README.md) - YAML-based configuration system

### Examples

#### Multiple Transports

```typescript
import {
  createLogger,
  createConsoleTransport,
  createFileTransport,
  createOtelTransport
} from 'wonder-logger'

const logger = createLogger({
  name: 'my-api',
  transports: [
    createConsoleTransport({ pretty: true, level: 'debug' }),
    createFileTransport({ dir: './logs', fileName: 'app.log' }),
    createOtelTransport({
      serviceName: 'my-api',
      endpoint: 'http://localhost:4318/v1/logs'
    })
  ]
})
```

#### Express Integration

```typescript
import express from 'express'
import morgan from 'morgan'
import {
  createLogger,
  createTelemetry,
  withTraceContext,
  createMorganStream,
  withSpan
} from 'wonder-logger'

// Initialize telemetry first
createTelemetry({ serviceName: 'my-api' })

// Create trace-aware logger
const logger = withTraceContext(createLogger({ name: 'my-api' }))

const app = express()

// HTTP request logging
app.use(morgan('combined', { stream: createMorganStream(logger) }))

// Request-scoped logging
app.use((req, res, next) => {
  req.logger = logger.child({ requestId: req.headers['x-request-id'] })
  next()
})

app.get('/users/:id', async (req, res) => {
  const user = await withSpan('fetch-user', async () => {
    req.logger.info({ userId: req.params.id }, 'Fetching user')
    return await db.users.findById(req.params.id)
  })

  res.json(user)
})

app.listen(3000, () => {
  logger.info({ port: 3000 }, 'Server started')
})
```

#### Memory Transport for Testing

```typescript
import {
  createLogger,
  createMemoryTransport,
  getMemoryLogs
} from 'wonder-logger'

const logger = createLogger({
  name: 'test',
  transports: [createMemoryTransport({ name: 'test-logs' })]
})

logger.info({ userId: 123 }, 'User action')

// Query logs
const logs = getMemoryLogs('test-logs', {
  level: 'info',
  format: 'parsed'
})

console.log(logs[0].userId) // 123
```

#### Manual Span Instrumentation

```typescript
import { withSpan } from 'wonder-logger'
import { metrics } from '@opentelemetry/api'

async function processPayment(orderId: string) {
  return withSpan('process-payment', async () => {
    // Your business logic
    const charge = await stripe.charges.create(...)

    // Record custom metrics
    const meter = metrics.getMeter('payments')
    const counter = meter.createCounter('payments_processed')
    counter.add(1, { status: 'success' })

    return charge
  })
}
```

## API Reference

### Logger

```typescript
// Create logger (programmatic)
createLogger(options: LoggerOptions): pino.Logger

// Create logger (config-driven)
createLoggerFromConfig(options?: {
  configPath?: string
  required?: boolean
  overrides?: Partial<LoggerOptions>
}): pino.Logger

// Transports
createConsoleTransport(options?: ConsoleTransportOptions): pino.StreamEntry
createFileTransport(options?: FileTransportOptions): pino.StreamEntry
createOtelTransport(options: OtelTransportOptions): pino.StreamEntry
createMemoryTransport(options?: MemoryTransportOptions): pino.StreamEntry

// Memory transport utilities
getMemoryLogs(name: string, options?: MemoryQueryOptions): RawLogEntry[] | ParsedLogEntry[]
clearMemoryLogs(name: string): void
getMemoryLogSize(name: string): number
getAllMemoryStoreNames(): string[]
disposeMemoryStore(name: string): void

// Memory transport streaming (RxJS)
getMemoryLogStream(name: string): Observable<RawLogEntry> | null
filterByLevel(level: string | string[]): OperatorFunction<RawLogEntry, RawLogEntry>
filterSince(timestamp: number): OperatorFunction<RawLogEntry, RawLogEntry>
withBackpressure(options: BackpressureOptions): OperatorFunction<RawLogEntry, RawLogEntry | RawLogEntry[]>

// Plugins
withTraceContext(logger: pino.Logger): pino.Logger
createMorganStream(logger: pino.Logger): NodeJS.WritableStream
```

### OpenTelemetry

```typescript
// Create telemetry SDK (programmatic)
createTelemetry(options: TelemetryOptions): TelemetrySDK

// Create telemetry SDK (config-driven)
createTelemetryFromConfig(options?: {
  configPath?: string
  required?: boolean
  overrides?: Partial<TelemetryOptions>
}): TelemetrySDK

// Manual instrumentation
withSpan(spanName: string, fn: () => Promise<T>, tracerName?: string): Promise<T>

// SDK methods
sdk.start(): void
sdk.shutdown(): Promise<void>
sdk.forceFlush(): Promise<void>
```

### Configuration

```typescript
// Load and parse configuration (returns Result type)
loadConfig(options?: {
  configPath?: string
  required?: boolean
}): ConfigResult<WonderLoggerConfig>

// Load from specific file (returns Result type)
loadConfigFromFile(filePath: string): ConfigResult<WonderLoggerConfig>

// Find config file in cwd (returns Result type)
findConfigFile(fileName?: string): ConfigResult<string>

// JSON parsing utilities (return Result types)
parseJSONResponse<T>(text: string): JSONResult<T>
validateJSONStructure<T>(data: unknown, requiredFields: string[]): JSONResult<T>
extractJSON(text: string): string
```

### Error Handling with Result Types

⭐Wonder Logger⭐ v2.0 introduces type-safe error handling using [ts-rust-result](https://github.com/jenova-marie/ts-rust-result). Config loading and JSON parsing functions now return `Result<T, E>` types instead of throwing errors, enabling explicit error handling with full type safety.

```typescript
import {
  loadConfig,
  parseJSONResponse,
  validateJSONStructure,
  type ConfigResult,
  type JSONResult,
  type ConfigError,
  type JSONError
} from 'wonder-logger'

// Config loading returns Result<Config, ConfigError>
const configResult = loadConfig()

if (configResult.ok) {
  // TypeScript knows configResult.value is WonderLoggerConfig
  const config = configResult.value
  console.log('Config loaded:', config.service.name)
} else {
  // TypeScript knows configResult.error is ConfigError
  const error = configResult.error

  // Pattern match on error kind
  switch (error.kind) {
    case 'FileNotFound':
      console.error('Config file not found:', error.context.path)
      break
    case 'InvalidYAML':
      console.error('Invalid YAML syntax:', error.message)
      break
    case 'MissingEnvVar':
      console.error('Missing env var:', error.context.varName)
      break
    default:
      console.error('Config error:', error.message)
  }
}

// JSON parsing returns Result<T, JSONError>
const jsonResult = parseJSONResponse<{ status: string }>('{"status": "ok"}')

if (jsonResult.ok) {
  console.log('Status:', jsonResult.value.status)
} else {
  console.error('JSON parse failed:', jsonResult.error.message)
}

// JSON validation returns Result<T, JSONError>
const data = { name: 'test', age: 30 }
const validationResult = validateJSONStructure(data, ['name', 'age', 'email'])

if (!validationResult.ok) {
  console.error('Missing fields:', validationResult.error.context.missingFields)
}
```

**Exported Types and Utilities:**
```typescript
// Core Result types
import { ok, err, type Result } from 'wonder-logger'

// Error types
import { type ConfigError, type JSONError, type DomainError } from 'wonder-logger'

// Error factory functions
import {
  fileNotFound,
  fileReadError,
  invalidJSON,
  fromError,
  tryResultSafe,
  toSentryError
} from 'wonder-logger'

// Observability helpers
import {
  toLogContext,      // Convert error to Pino log context
  toSpanAttributes,  // Convert error to OpenTelemetry span attributes
  toMetricLabels     // Convert error to Prometheus metric labels
} from 'wonder-logger'
```

**For comprehensive documentation** on Result types and error handling patterns, see the [ts-rust-result documentation](https://github.com/jenova-marie/ts-rust-result).

## Environment Variables

### Logging

```bash
LOG_LEVEL=info  # Minimum log level (trace, debug, info, warn, error, fatal)
```

### OpenTelemetry

```bash
# OTLP Exporter
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
OTEL_EXPORTER_OTLP_HEADERS='{"x-api-key":"secret"}'

# Jaeger Exporter
JAEGER_ENDPOINT=http://localhost:14268/api/traces

# Metrics
OTEL_EXPORTER_OTLP_METRICS_ENDPOINT=http://localhost:4318/v1/metrics

# General
NODE_ENV=production
```

## Testing

⭐Wonder Logger⭐ includes comprehensive test coverage:

- **237 unit tests** - Fast, isolated component testing
- **63 integration tests** - Real behavior validation
- **19 E2E tests** - Production stack validation

```bash
# Run all tests
pnpm test

# Run by category
pnpm test:unit
pnpm test:integration
pnpm test:e2e

# Coverage reports
pnpm test:coverage
pnpm test:unit:coverage

# Watch mode
pnpm test:watch
```

## Performance

### Logging (Pino)

- **30,000+ logs/second** (JSON mode)
- **20,000+ logs/second** (pretty mode)
- **< 1ms per log entry**
- Async by default with background worker threads

### OpenTelemetry

- Negligible overhead with batching
- Configurable sampling rates
- Background export workers

## Production Best Practices

1. **Use JSON in production**
   ```typescript
   createConsoleTransport({ pretty: false })
   ```

2. **Set appropriate log levels**
   ```typescript
   level: process.env.NODE_ENV === 'production' ? 'info' : 'debug'
   ```

3. **Use OTLP for centralized collection**
   ```typescript
   createOtelTransport({ serviceName: 'my-api' })
   ```

4. **Include trace context for correlation**
   ```typescript
   const logger = withTraceContext(baseLogger)
   ```

5. **Use structured data, not string interpolation**
   ```typescript
   logger.info({ userId, orderId }, 'Order placed')  // Good
   logger.info(`Order ${orderId} by ${userId}`)       // Bad
   ```

6. **Child loggers for scoped context**
   ```typescript
   const requestLogger = logger.child({ requestId })
   ```

7. **Configure sampling for high-volume services**
   ```typescript
   createTelemetry({
     tracing: { sampleRate: 0.1 }  // 10% sampling
   })
   ```

## TypeScript

⭐Wonder Logger⭐ is written in TypeScript and provides complete type definitions:

```typescript
import type {
  // Logger types
  LoggerOptions,
  ConsoleTransportOptions,
  FileTransportOptions,
  OtelTransportOptions,
  MemoryTransportOptions,
  MemoryQueryOptions,
  RawLogEntry,
  ParsedLogEntry,
  BackpressureOptions,

  // OpenTelemetry types
  TelemetryOptions,
  TracingOptions,
  MetricsOptions,
  TelemetrySDK,

  // Configuration types
  WonderLoggerConfig,
  ServiceConfig,
  LoggerConfig,
  OtelConfig,
  TransportConfig,
  LoggerPluginsConfig,
  TracingConfig,
  MetricsConfig,
  MetricsExporterConfig,
  PrometheusExporterConfig,
  OtlpMetricsExporterConfig,
  InstrumentationConfig
} from 'wonder-logger'
```

### Module Configuration

Your `tsconfig.json` should include:

```json
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "target": "ES2022"
  }
}
```

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Write tests for your changes
4. Ensure all tests pass: `pnpm test`
5. Commit with descriptive messages
6. Submit a pull request

### Development Setup

```bash
# Clone repository
git clone https://github.com/jenova-marie/wonder-logger.git
cd wonder-logger

# Install dependencies
pnpm install

# Run tests
pnpm test

# Build
pnpm build
```

## License

MIT © [jenova-marie](https://github.com/jenova-marie)

## Acknowledgments

⭐Wonder Logger⭐ is built on these excellent open-source projects:

- [Pino](https://getpino.io/) - Fast and low overhead logging
- [OpenTelemetry](https://opentelemetry.io/) - Vendor-neutral observability framework
- [Grafana](https://grafana.com/) - Visualization and observability platform

## Support

- [Documentation](https://github.com/jenova-marie/wonder-logger#readme)
- [Issue Tracker](https://github.com/jenova-marie/wonder-logger/issues)
- [Discussions](https://github.com/jenova-marie/wonder-logger/discussions)
- [Security Policy](./content/SECURITY.md)

---

**Made with ✨ by [jenova-marie](https://github.com/jenova-marie)**

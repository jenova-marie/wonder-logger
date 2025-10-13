# ⭐Star Logger⭐

> Production-ready observability toolkit combining OpenTelemetry instrumentation with structured Pino logging for Node.js applications

[![Build Status](https://github.com/jenova-marie/star-logger/actions/workflows/ci.yml/badge.svg)](https://github.com/jenova-marie/star-logger/actions/workflows/ci.yml)
[![codecov](https://codecov.io/github/jenova-marie/star-logger/graph/badge.svg?token=7GEHX9N0O2)](https://codecov.io/github/jenova-marie/star-logger)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![npm version](https://img.shields.io/npm/v/star-logger.svg)](https://www.npmjs.com/package/star-logger)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9+-blue.svg)](https://www.typescriptlang.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

⭐Star Logger⭐ is a comprehensive observability solution that unifies structured logging and distributed tracing for Node.js applications. Built on industry-standard tools ([Pino](https://getpino.io/) and [OpenTelemetry](https://opentelemetry.io/)), it provides a clean, modular API for instrumenting your applications with production-grade observability.

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
npm install star-logger
```

```bash
yarn add star-logger
```

```bash
pnpm add star-logger
```

## Quick Start

### Basic Logging

```typescript
import { createLogger } from 'star-logger'

const logger = createLogger({
  name: 'my-service',
  level: 'info'
})

logger.info('Application started')
logger.info({ userId: 123 }, 'User logged in')
logger.error({ err: new Error('Failed') }, 'Operation failed')
```

### OpenTelemetry Instrumentation

```typescript
import { createTelemetry } from 'star-logger'

// Initialize telemetry BEFORE other imports
const sdk = createTelemetry({
  serviceName: 'my-api',
  serviceVersion: '1.0.0',
  environment: 'production',

  tracing: {
    exporter: 'otlp'  // or 'console', 'jaeger'
  },

  metrics: {
    exporters: ['prometheus', 'otlp'],
    port: 9090
  }
})

// Auto-instrumentation is now active!
// HTTP, Express, databases, and more are automatically traced
```

### Combined Logging + Tracing

```typescript
import { createLogger, createTelemetry, withTraceContext, withSpan } from 'star-logger'

// Initialize telemetry
createTelemetry({ serviceName: 'my-api' })

// Create trace-aware logger
const baseLogger = createLogger({ name: 'my-api' })
const logger = withTraceContext(baseLogger)

// Logs will include trace_id and span_id
await withSpan('process-order', async () => {
  logger.info('Processing order')
  // { level: 30, trace_id: "abc123", span_id: "def456", msg: "Processing order" }
})
```

## Architecture

```
star-logger/
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

### Examples

#### Multiple Transports

```typescript
import {
  createLogger,
  createConsoleTransport,
  createFileTransport,
  createOtelTransport
} from 'star-logger'

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
} from 'star-logger'

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
} from 'star-logger'

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
import { withSpan } from 'star-logger'
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
// Create logger
createLogger(options: LoggerOptions): pino.Logger

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

// Plugins
withTraceContext(logger: pino.Logger): pino.Logger
createMorganStream(logger: pino.Logger): NodeJS.WritableStream
```

### OpenTelemetry

```typescript
// Create telemetry SDK
createTelemetry(options: TelemetryOptions): TelemetrySDK

// Manual instrumentation
withSpan(spanName: string, fn: () => Promise<T>, tracerName?: string): Promise<T>

// SDK methods
sdk.start(): void
sdk.shutdown(): Promise<void>
sdk.forceFlush(): Promise<void>
```

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

⭐Star Logger⭐ includes comprehensive test coverage:

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

⭐Star Logger⭐ is written in TypeScript and provides complete type definitions:

```typescript
import type {
  LoggerOptions,
  ConsoleTransportOptions,
  FileTransportOptions,
  OtelTransportOptions,
  MemoryTransportOptions,
  TelemetryOptions,
  TracingOptions,
  MetricsOptions,
  TelemetrySDK
} from 'star-logger'
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
git clone https://github.com/jenova-marie/star-logger.git
cd star-logger

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

⭐Star Logger⭐ is built on these excellent open-source projects:

- [Pino](https://getpino.io/) - Fast and low overhead logging
- [OpenTelemetry](https://opentelemetry.io/) - Vendor-neutral observability framework
- [Grafana](https://grafana.com/) - Visualization and observability platform

## Support

- [Documentation](https://github.com/jenova-marie/star-logger#readme)
- [Issue Tracker](https://github.com/jenova-marie/star-logger/issues)
- [Discussions](https://github.com/jenova-marie/star-logger/discussions)

---

**Made with ✨ by [jenova-marie](https://github.com/jenova-marie)**

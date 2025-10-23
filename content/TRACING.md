# Tracing Guide

Distributed tracing with OpenTelemetry - instrument your Node.js applications for observability.

## Quick Reference

For comprehensive OpenTelemetry documentation, see **[src/utils/otel/README.md](../src/utils/otel/README.md)**

## Quick Start

```typescript
import { createTelemetry, withSpan } from '@jenova-marie/wonder-logger'

const sdk = createTelemetry({
  serviceName: 'my-api',
  tracing: {
    exporter: 'otlp',
    endpoint: 'http://localhost:4318/v1/traces'
  }
})

// Manual instrumentation
await withSpan('process-order', async () => {
  // Your code here
})
```

## Key Features

- **Auto-Instrumentation** - Automatic HTTP, Express, database tracing
- **Multiple Exporters** - OTLP, Jaeger, Console
- **Manual Spans** - `withSpan()` helper for custom instrumentation
- **Trace-Log Correlation** - Automatic correlation with logs
- **Graceful Shutdown** - Automatic signal handlers

## Trace Exporters

### OTLP Exporter

```typescript
const sdk = createTelemetry({
  serviceName: 'my-api',
  tracing: {
    exporter: 'otlp',
    endpoint: 'http://localhost:4318/v1/traces'
  }
})
```

### Jaeger Exporter

```typescript
const sdk = createTelemetry({
  serviceName: 'my-api',
  tracing: {
    exporter: 'jaeger',
    endpoint: 'http://localhost:14268/api/traces'
  }
})
```

### Console Exporter

```typescript
const sdk = createTelemetry({
  serviceName: 'my-api',
  tracing: {
    exporter: 'console'
  }
})
```

## Manual Instrumentation

### Basic Span

```typescript
import { withSpan } from '@jenova-marie/wonder-logger'

await withSpan('database-query', async () => {
  const results = await db.query('SELECT * FROM users')
  return results
})
```

### Nested Spans

```typescript
await withSpan('process-order', async () => {
  // Parent span

  await withSpan('validate-order', async () => {
    // Child span
  })

  await withSpan('save-order', async () => {
    // Child span
  })
})
```

### Add Span Attributes

```typescript
import { trace } from '@opentelemetry/api'

await withSpan('process-payment', async () => {
  const span = trace.getActiveSpan()
  span?.setAttribute('payment.amount', 99.99)
  span?.setAttribute('payment.currency', 'USD')
  span?.setAttribute('user.id', userId)
})
```

## Trace-Log Correlation

```typescript
import { createLogger, withTraceContext } from '@jenova-marie/wonder-logger'

const logger = createLogger({ name: 'api' })
const tracedLogger = withTraceContext(logger)

await withSpan('process-request', async () => {
  tracedLogger.info('Processing request')
  // Log includes: trace_id, span_id, trace_flags
})
```

## Auto-Instrumentation

Auto-instrumentation is enabled by default:

```typescript
const sdk = createTelemetry({
  serviceName: 'my-api',
  instrumentation: {
    auto: true,  // Enable all auto-instrumentations
    http: true   // HTTP-specific instrumentation
  }
})
```

Automatically traces:
- HTTP/HTTPS requests and responses
- Express routes
- Database queries (Postgres, MySQL, MongoDB, Redis)
- DNS lookups
- And more...

## Complete Documentation

See **[src/utils/otel/README.md](../src/utils/otel/README.md)** for:
- Exporter configuration
- Manual instrumentation
- Auto-instrumentation
- Custom attributes
- Best practices

---

**Version**: 2.0.0
**Last Updated**: October 2025

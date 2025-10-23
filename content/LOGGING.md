# Logging Guide

Structured logging with Pino - fast, JSON-based logging for Node.js applications.

## Quick Reference

For comprehensive logging documentation, see **[src/utils/logger/README.md](../src/utils/logger/README.md)**

## Quick Start

```typescript
import { createLogger } from '@jenova-marie/wonder-logger'

const logger = createLogger({
  name: 'my-api',
  level: 'info'
})

logger.info({ userId: 123 }, 'User logged in')
```

## Key Features

- **Structured Logging** - JSON-based with Pino
- **Multiple Transports** - Console, file, OTEL, memory
- **Trace Context** - Auto-inject trace_id and span_id
- **High Performance** - 30,000+ logs/second
- **RxJS Streaming** - Real-time log monitoring

## Important: Parameter Order

⚠️ **Data object MUST come before message**:

```typescript
// ✅ CORRECT
logger.info({ userId: 123 }, 'User logged in')

// ❌ WRONG - data is lost!
logger.info('User logged in', { userId: 123 })
```

## Transports

### Console Transport

```typescript
import { createConsoleTransport } from '@jenova-marie/wonder-logger'

const transport = createConsoleTransport({
  pretty: true  // Pretty-print for development
})
```

### File Transport

```typescript
import { createFileTransport } from '@jenova-marie/wonder-logger'

const transport = createFileTransport({
  dir: './logs',
  fileName: 'app.log'
})
```

### Memory Transport

```typescript
import { createMemoryTransport, getMemoryLogs } from '@jenova-marie/wonder-logger'

const transport = createMemoryTransport({
  name: 'my-app',
  maxSize: 10000
})

// Query logs
const logs = getMemoryLogs('my-app', {
  since: Date.now() - 300000,  // Last 5 minutes
  level: ['error', 'warn'],
  format: 'parsed'
})
```

### OTEL Transport

```typescript
import { createOtelTransport } from '@jenova-marie/wonder-logger'

const transport = createOtelTransport({
  endpoint: 'http://localhost:4318/v1/logs'
})
```

## Plugins

### Trace Context Plugin

Automatically inject trace_id and span_id:

```typescript
import { withTraceContext } from '@jenova-marie/wonder-logger'

const logger = createLogger({ name: 'api' })
const tracedLogger = withTraceContext(logger)

// Logs now include trace_id, span_id, trace_flags
tracedLogger.info('Request processed')
```

### Morgan HTTP Logging

```typescript
import { createMorganStream } from '@jenova-marie/wonder-logger'
import morgan from 'morgan'
import express from 'express'

const app = express()
const logger = createLogger({ name: 'http' })

app.use(morgan('combined', {
  stream: createMorganStream(logger)
}))
```

## Complete Documentation

See **[src/utils/logger/README.md](../src/utils/logger/README.md)** for:
- Transport configuration
- Plugin usage
- RxJS streaming
- Testing patterns
- Best practices

---

**Version**: 2.0.0
**Last Updated**: October 2025

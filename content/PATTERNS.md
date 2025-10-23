# Common Usage Patterns

Common patterns and best practices for using Wonder Logger in production applications.

## Table of Contents

- [Initialization Patterns](#initialization-patterns)
- [Error Handling Patterns](#error-handling-patterns)
- [Testing Patterns](#testing-patterns)
- [Production Patterns](#production-patterns)

---

## Initialization Patterns

### Pattern 1: Config-Driven Initialization

**Best for**: Production applications with environment-specific config

```typescript
import { createLoggerFromConfig, createTelemetryFromConfig } from '@jenova-marie/wonder-logger'

// Load from wonder-logger.yaml
const sdk = createTelemetryFromConfig()
const logger = createLoggerFromConfig()

// Use throughout application
logger.info('Application started')
```

### Pattern 2: Programmatic Initialization

**Best for**: Libraries, testing, or when YAML config isn't suitable

```typescript
import { createLogger, createTelemetry } from '@jenova-marie/wonder-logger'

const logger = createLogger({
  name: 'my-library',
  level: process.env.LOG_LEVEL || 'info'
})

const sdk = createTelemetry({
  serviceName: 'my-library',
  tracing: { enabled: false }  // Disable in library
})
```

### Pattern 3: Lazy Initialization

**Best for**: Lambda functions, serverless

```typescript
let logger: pino.Logger | null = null
let sdk: TelemetrySDK | null = null

export function getLogger() {
  if (!logger) {
    const result = loadConfig()
    if (result.ok) {
      logger = createLoggerFromConfig()
      sdk = createTelemetryFromConfig()
    } else {
      logger = createLogger({ name: 'fallback', level: 'info' })
    }
  }
  return logger
}
```

---

## Error Handling Patterns

### Pattern 1: Config Loading with Fallback

```typescript
function initializeConfig(): WonderLoggerConfig {
  const result = loadConfig()

  if (result.ok) {
    return result.value
  }

  // Try fallback locations
  const fallbacks = ['./config.yaml', '/etc/wonder-logger/config.yaml']
  for (const path of fallbacks) {
    const fbResult = loadConfigFromFile(path)
    if (fbResult.ok) return fbResult.value
  }

  // Use defaults
  return getDefaultConfig()
}
```

### Pattern 2: Comprehensive Error Logging

```typescript
import { toLogContext } from '@jenova-marie/wonder-logger'

const result = loadConfig()

if (!result.ok) {
  logger.error({
    ...toLogContext(result.error),
    attemptedPath: process.cwd(),
    environment: process.env.NODE_ENV
  }, 'Configuration load failed')

  process.exit(1)
}
```

### Pattern 3: Error Recovery

```typescript
const result = parseJSONResponse(llmOutput)

if (!result.ok) {
  if (result.error.kind === 'JSONExtractionError') {
    // Retry with manual extraction
    const cleaned = cleanLLMOutput(llmOutput)
    return parseJSONResponse(cleaned)
  }
  throw new Error(`Parse failed: ${result.error.message}`)
}
```

---

## Testing Patterns

### Pattern 1: Memory Transport for Tests

```typescript
import { createLogger, createMemoryTransport } from '@jenova-marie/wonder-logger'

describe('My Tests', () => {
  let logger: pino.Logger

  beforeEach(() => {
    logger = createLogger({
      name: 'test',
      level: 'debug',
      transport: [createMemoryTransport({ name: 'test-logs' })]
    })
  })

  it('should log errors', () => {
    logger.error('Test error')

    const logs = getMemoryLogs('test-logs', { format: 'parsed' })
    expect(logs).toHaveLength(1)
    expect(logs[0].level).toBe('error')
  })
})
```

### Pattern 2: Disable OTEL in Tests

```typescript
const sdk = createTelemetry({
  serviceName: 'test',
  tracing: { enabled: false },
  metrics: { enabled: false }
})
```

### Pattern 3: Config Testing

```typescript
import { loadConfig } from '@jenova-marie/wonder-logger'
import { vol } from 'memfs'

vi.mock('fs/promises', () => memfs.promises)

it('should load valid config', () => {
  vol.fromJSON({
    '/app/config.yaml': 'service:\n  name: test'
  })

  const result = loadConfig({ configPath: '/app/config.yaml' })
  expect(result.ok).toBe(true)
  if (result.ok) {
    expect(result.value.service.name).toBe('test')
  }
})
```

---

## Production Patterns

### Pattern 1: Graceful Shutdown

```typescript
import { createTelemetryFromConfig } from '@jenova-marie/wonder-logger'

const sdk = createTelemetryFromConfig()  // Auto-registers handlers

// Manual shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Shutting down gracefully...')
  await sdk.shutdown()  // Flushes pending spans/metrics
  process.exit(0)
})
```

### Pattern 2: Structured Logging

```typescript
// ✅ GOOD - Data object first
logger.info({ userId: 123, action: 'login' }, 'User logged in')

// ✅ GOOD - With error
try {
  await riskyOperation()
} catch (err) {
  logger.error({ err, userId: 123 }, 'Operation failed')
}

// ❌ BAD - Message first (data lost!)
logger.info('User logged in', { userId: 123 })
```

### Pattern 3: Trace-Log Correlation

```typescript
import { withTraceContext } from '@jenova-marie/wonder-logger'

const logger = createLoggerFromConfig()
const tracedLogger = withTraceContext(logger)

// Inside traced operation
await withSpan('process-order', async () => {
  tracedLogger.info({ orderId: 123 }, 'Processing order')
  // Output includes: trace_id, span_id, trace_flags
})
```

### Pattern 4: Multi-Environment Config

```yaml
# config/base.yaml
service:
  name: my-api

# config/production.yaml (extends base)
logger:
  level: info
otel:
  tracing:
    endpoint: https://otel.prod.example.com/v1/traces
```

```typescript
const env = process.env.NODE_ENV || 'development'
const result = loadConfig({ configPath: `./config/${env}.yaml` })
```

---

## Further Reading

- **[content/ERROR_HANDLING.md](./ERROR_HANDLING.md)** - Result types and error handling
- **[content/TESTING.md](./TESTING.md)** - Comprehensive testing guide
- **[content/CONFIGURATION.md](./CONFIGURATION.md)** - Configuration system

---

**Version**: 2.0.0
**Last Updated**: October 2025

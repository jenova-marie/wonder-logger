# OpenTelemetry Utilities

A modular, testable, and composable OpenTelemetry instrumentation system for Node.js applications.

## Philosophy

This implementation follows the **KISS principle** (Keep It Simple, Silly):
- **Clean**: No singletons, no auto-initialization, no side effects
- **Testable**: Each module is independently unit-testable
- **Powerful**: Full composability with explicit configuration
- **Dependable**: Explicit dependencies, fail-fast errors

## Architecture

```
src/utils/otel/
├── types.ts                    # TypeScript type definitions
├── index.ts                    # Main factory function
├── utils/                      # Utility functions
│   ├── resource.ts            # Service resource builder
│   ├── withSpan.ts            # Manual span instrumentation
│   └── gracefulShutdown.ts    # Graceful shutdown handler
├── exporters/                  # Exporter builders
│   ├── tracing/
│   │   ├── console.ts         # Console trace exporter
│   │   ├── otlp.ts            # OTLP trace exporter
│   │   └── jaeger.ts          # Jaeger trace exporter
│   └── metrics/
│       ├── prometheus.ts      # Prometheus metrics exporter
│       └── otlp.ts            # OTLP metrics exporter
└── instrumentations/           # Instrumentation builders
    ├── auto.ts                # Auto-instrumentation setup
    └── httpHooks.ts           # HTTP request/response hooks
```

## Quick Start

### Basic Usage

```typescript
import { createTelemetry } from './utils/otel'

// Minimal configuration with defaults
const sdk = createTelemetry({
  serviceName: 'my-api',
})

// Telemetry is now active!
// - Console trace exporter
// - Prometheus metrics on :9464/metrics
// - Auto-instrumentation enabled
// - Graceful shutdown handlers registered
```

### Production Configuration

```typescript
import { createTelemetry } from './utils/otel'

const sdk = createTelemetry({
  serviceName: 'my-api',
  serviceVersion: '1.2.3',
  environment: 'production',

  tracing: {
    exporter: 'otlp',
  },

  metrics: {
    exporters: ['prometheus', 'otlp'],
    port: 9090,
  },
})
```

## Configuration Options

### TelemetryOptions

```typescript
interface TelemetryOptions {
  serviceName: string           // Required: Name of your service
  serviceVersion?: string        // Default: '0.0.0'
  environment?: string          // Default: NODE_ENV || 'development'
  tracing?: TracingOptions      // Trace configuration
  metrics?: MetricsOptions      // Metrics configuration
}
```

### TracingOptions

```typescript
interface TracingOptions {
  enabled?: boolean             // Default: true
  exporter?: 'console' | 'otlp' | 'jaeger'  // Default: 'console'
  sampleRate?: number           // Default: 1 (100%)
}
```

### MetricsOptions

```typescript
interface MetricsOptions {
  enabled?: boolean             // Default: true
  exporters?: ('prometheus' | 'otlp')[]  // Default: ['prometheus']
  port?: number                 // Default: 9464 (Prometheus endpoint)
}
```

## Exporters

### Trace Exporters

#### Console (Default)
```typescript
createTelemetry({
  serviceName: 'my-api',
  tracing: { exporter: 'console' }
})
```

#### OTLP (Honeycomb, Grafana Tempo, Jaeger)
```typescript
// Configure via environment variables:
// OTEL_EXPORTER_OTLP_ENDPOINT=https://api.honeycomb.io
// OTEL_EXPORTER_OTLP_HEADERS={"x-honeycomb-team":"your-api-key"}

createTelemetry({
  serviceName: 'my-api',
  tracing: { exporter: 'otlp' }
})
```

#### Jaeger
```typescript
// Configure via environment variable:
// JAEGER_ENDPOINT=http://jaeger:14268/api/traces

createTelemetry({
  serviceName: 'my-api',
  tracing: { exporter: 'jaeger' }
})
```

### Metrics Exporters

#### Prometheus (Default)
```typescript
createTelemetry({
  serviceName: 'my-api',
  metrics: {
    port: 9464  // Metrics at http://localhost:9464/metrics
  }
})
```

#### OTLP
```typescript
// Configure via environment variable:
// OTEL_EXPORTER_OTLP_METRICS_ENDPOINT=https://metrics.example.com/v1/metrics

createTelemetry({
  serviceName: 'my-api',
  metrics: {
    exporters: ['otlp']
  }
})
```

#### Multiple Exporters
```typescript
createTelemetry({
  serviceName: 'my-api',
  metrics: {
    exporters: ['prometheus', 'otlp'],
    port: 9090
  }
})
```

## Manual Instrumentation

### Using withSpan

The `withSpan` utility wraps async functions with OpenTelemetry spans:

```typescript
import { withSpan } from './utils/otel'

async function processOrder(orderId: string) {
  return withSpan('process-order', async () => {
    // Your business logic here
    const order = await db.orders.findById(orderId)
    await payment.charge(order)
    return order
  })
}
```

#### Custom Tracer Name

```typescript
import { withSpan } from './utils/otel'

const result = await withSpan(
  'database-query',
  async () => db.query('SELECT * FROM users'),
  'my-service'  // Custom tracer name
)
```

#### Error Handling

Errors are automatically recorded as span exceptions:

```typescript
try {
  await withSpan('risky-operation', async () => {
    throw new Error('Something went wrong')
  })
} catch (error) {
  // Span will have:
  // - status: ERROR
  // - recorded exception with stack trace
  // - error message in span status
}
```

## Environment Variables

### Trace Exporters

| Variable | Description | Default |
|----------|-------------|---------|
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OTLP endpoint URL | `http://localhost:4318/v1/traces` |
| `OTEL_EXPORTER_OTLP_HEADERS` | JSON headers for OTLP | `{}` |
| `JAEGER_ENDPOINT` | Jaeger endpoint URL | `http://localhost:14268/api/traces` |

### Metrics Exporters

| Variable | Description | Default |
|----------|-------------|---------|
| `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT` | OTLP metrics endpoint | `http://localhost:4318/v1/metrics` |

### Service Metadata

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Deployment environment | `development` |

## Graceful Shutdown

Graceful shutdown is automatically configured when you call `createTelemetry()`.

Signal handlers are registered for `SIGTERM` and `SIGINT` that:
1. Log the shutdown signal
2. Flush all pending telemetry to exporters
3. Shut down the OpenTelemetry SDK cleanly
4. Exit the process

### Manual Shutdown

```typescript
const sdk = createTelemetry({ serviceName: 'my-api' })

// Later, manually shutdown
await sdk.shutdown()
```

## Auto-Instrumentation

The following libraries are automatically instrumented:
- HTTP/HTTPS (with custom request/response hooks)
- Express
- GraphQL
- MongoDB
- PostgreSQL
- MySQL
- Redis
- And many more...

**Note**: File system instrumentation is disabled by default for performance.

## HTTP Request/Response Hooks

When auto-instrumentation is enabled, HTTP requests and responses are enriched with additional attributes:

### Request Attributes
- `http.user_agent`
- `http.x_forwarded_for`
- `http.x_request_id`
- `http.x_correlation_id`

### Response Attributes
- `http.response.content_length`
- `http.response.content_type`

## Disabling Telemetry

### Disable Tracing
```typescript
createTelemetry({
  serviceName: 'my-api',
  tracing: { enabled: false }
})
```

### Disable Metrics
```typescript
createTelemetry({
  serviceName: 'my-api',
  metrics: { enabled: false }
})
```

### Disable Both
```typescript
createTelemetry({
  serviceName: 'my-api',
  tracing: { enabled: false },
  metrics: { enabled: false }
})
```

## Testing

All modules are independently unit-testable:

```typescript
import { createResource } from './utils/resource'
import { createConsoleTraceExporter } from './exporters/tracing/console'
import { createHttpRequestHook } from './instrumentations/httpHooks'

// Test resource builder
const resource = createResource({
  serviceName: 'test',
  serviceVersion: '1.0.0'
})

// Test exporters
const exporter = createConsoleTraceExporter()

// Test hooks
const requestHook = createHttpRequestHook()
```

## Migration from Old Architecture

### Old (Monolithic Class)
```typescript
import otel, { RecoverySkyTelemetry } from './utils/otel'

const telemetry = new RecoverySkyTelemetry()
telemetry.init()

const tracer = telemetry.getTracer()
const meter = telemetry.getMeter()

await telemetry.withSpan('operation', {}, async () => {
  // ...
})
```

### New (Modular Factory)
```typescript
import { createTelemetry, withSpan } from './utils/otel'

const sdk = createTelemetry({
  serviceName: 'my-api'
})

// Tracer and meter available via @opentelemetry/api
import { trace, metrics } from '@opentelemetry/api'
const tracer = trace.getTracer('my-tracer')
const meter = metrics.getMeter('my-meter')

await withSpan('operation', async () => {
  // ...
})
```

## Examples

### Express Application
```typescript
import express from 'express'
import { createTelemetry, withSpan } from './utils/otel'

// Initialize telemetry BEFORE creating Express app
createTelemetry({
  serviceName: 'my-express-api',
  serviceVersion: '1.0.0',
  tracing: { exporter: 'otlp' },
  metrics: { port: 9090 }
})

const app = express()

app.get('/users/:id', async (req, res) => {
  const user = await withSpan('fetch-user', async () => {
    return await db.users.findById(req.params.id)
  })

  res.json(user)
})

app.listen(3000)
```

### Background Worker
```typescript
import { createTelemetry, withSpan } from './utils/otel'

createTelemetry({
  serviceName: 'order-processor',
  tracing: { exporter: 'jaeger' }
})

async function processQueue() {
  while (true) {
    const job = await queue.pop()

    await withSpan(`process-job-${job.id}`, async () => {
      await job.execute()
    })
  }
}

processQueue()
```

## Troubleshooting

### Traces not appearing
1. Check exporter configuration
2. Verify environment variables are set correctly
3. Ensure `createTelemetry()` is called before instrumented code runs

### Metrics endpoint not accessible
1. Check if port is available
2. Verify firewall rules
3. Ensure Prometheus exporter is enabled

### High memory usage
1. Reduce trace sample rate: `tracing: { sampleRate: 0.1 }`
2. Disable unused instrumentations
3. Check for span leaks (spans not properly ended)

## Best Practices

1. **Initialize early**: Call `createTelemetry()` as early as possible in your application startup
2. **Use withSpan for critical paths**: Wrap important business logic for better observability
3. **Set meaningful service names**: Use descriptive names like `payment-api` not `api`
4. **Version your services**: Always include `serviceVersion` in production
5. **Use environment-specific configuration**: Different exporters for dev vs. production
6. **Monitor your metrics endpoint**: Ensure `/metrics` is accessible to Prometheus
7. **Test graceful shutdown**: Verify telemetry flushes on shutdown

## License

MIT

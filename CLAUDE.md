# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

`recoverysky-server` is a production-ready observability toolkit providing OpenTelemetry instrumentation and structured logging for Node.js applications. The package is designed as a shared library for RecoverySky server projects.

**Current version**: 0.0.1
**Test coverage**: 319 tests (237 unit, 63 integration, 19 E2E)

## Build & Test Commands

### Building
```bash
pnpm build                 # Compile TypeScript to dist/
```

### Testing
```bash
# Run all tests (319 total)
pnpm test

# Run by category
pnpm test:unit            # 237 unit tests (mocked, fast)
pnpm test:integration     # 63 integration tests (real behavior)
pnpm test:e2e             # 19 E2E tests (requires infrastructure)

# Coverage reports
pnpm test:coverage
pnpm test:unit:coverage
pnpm test:integration:coverage

# Watch mode
pnpm test:watch

# UI mode
pnpm test:ui

# Run single test file
pnpm test tests/unit/otel/index.test.ts
pnpm test tests/e2e/loki.test.ts
```

### E2E Tests
E2E tests validate against production observability stack (Loki, Tempo, Prometheus):

```bash
# Must set TLS env var for self-signed certs
export NODE_TLS_REJECT_UNAUTHORIZED=0

# Run E2E tests
pnpm test:e2e

# Specific backend
pnpm test tests/e2e/loki.test.ts
pnpm test tests/e2e/tempo.test.ts
pnpm test tests/e2e/metrics.test.ts
```

## Architecture

### High-Level Structure

```
src/utils/
├── otel/          # OpenTelemetry SDK factory and utilities
└── logger/        # Pino-based structured logging
```

### Key Design Principles

1. **Modular Factory Pattern**: No singletons, no global state, no auto-initialization
2. **Composable**: Mix and match exporters, transports, and plugins
3. **Testable**: Every module is independently unit-testable
4. **ESM-First**: Modern ES modules with TypeScript

### OpenTelemetry Architecture (`src/utils/otel/`)

The OTEL implementation uses a **factory pattern** instead of the legacy class-based singleton:

```typescript
// Factory returns SDK wrapper with helper methods
createTelemetry(options: TelemetryOptions): TelemetrySDK

// SDK wrapper interface
interface TelemetrySDK {
  start: () => void              // Start SDK (called automatically)
  shutdown: () => Promise<void>  // Graceful shutdown with flush
  forceFlush: () => Promise<void> // Force flush (testing only)
}
```

**Key files:**
- `index.ts` - Main factory function that orchestrates SDK creation
- `types.ts` - All TypeScript interfaces (TelemetryOptions, TelemetrySDK, etc.)
- `exporters/` - Builder functions for trace/metric exporters (console, OTLP, Jaeger, Prometheus)
- `utils/resource.ts` - Creates OTEL Resource with service metadata
- `utils/withSpan.ts` - Manual instrumentation helper for wrapping async functions
- `utils/gracefulShutdown.ts` - Automatic SIGTERM/SIGINT handlers
- `instrumentations/auto.ts` - Auto-instrumentation setup (HTTP, Express, databases)
- `instrumentations/httpHooks.ts` - Custom HTTP request/response attribute hooks

**Important: SDK Wrapper**

The `createTelemetry()` function returns a **wrapper object**, not the raw `NodeSDK`:

```typescript
// Returns wrapper with helper methods
const sdk = createTelemetry({ serviceName: 'my-api' })

// SDK methods
await sdk.forceFlush()   // Force immediate export (testing)
await sdk.shutdown()     // Graceful shutdown
sdk.start()              // Already called automatically

// Tracer/Meter accessed via @opentelemetry/api globals
import { trace, metrics } from '@opentelemetry/api'
const tracer = trace.getTracer('my-tracer')
const meter = metrics.getMeter('my-meter')
```

This wrapper was added to provide `forceFlush()` for testing (E2E tests need to flush metrics before querying Prometheus).

### Logger Architecture (`src/utils/logger/`)

Pino-based logging with pluggable transports and OpenTelemetry correlation:

```typescript
// Factory returns Pino logger
createLogger(options: LoggerOptions): pino.Logger
```

**Key files:**
- `index.ts` - Main logger factory
- `types.ts` - All TypeScript interfaces
- `transports/console.ts` - Console transport with optional pretty printing
- `transports/file.ts` - File system transport with async I/O
- `transports/otel.ts` - OpenTelemetry OTLP transport
- `plugins/traceContext.ts` - Injects trace_id/span_id into logs
- `plugins/morganStream.ts` - Adapter for Morgan HTTP request logging

**Important: Trace Context Plugin**

The `withTraceContext()` plugin wraps a logger to automatically inject OTEL trace context:

```typescript
const baseLogger = createLogger({ name: 'api' })
const logger = withTraceContext(baseLogger)

// Inside a traced operation
await withSpan('operation', async () => {
  logger.info('Message')
  // Output includes: trace_id, span_id, trace_flags
})
```

This enables log-trace correlation in Grafana.

## Testing Strategy

### Unit Tests (`tests/unit/`)

- **237 tests** - Fast, isolated, heavily mocked
- Test individual functions and modules
- Use mocks for external dependencies (file system, network)
- Run in milliseconds

### Integration Tests (`tests/integration/`)

- **63 tests** - Real behavior, no mocks
- Test full logger pipelines (transports, plugins, file I/O)
- Validate OpenTelemetry metrics integration
- Test error handling, high-volume logging, edge cases

### E2E Tests (`tests/e2e/`)

- **19 tests** - Production observability stack validation
- **Requires**: Loki, Tempo, Prometheus, OTEL Collector running on `metis.prod.rso`
- **Network**: VPN connection to `*.rso` private Route53 zone
- **TLS**: Self-signed certs, requires `NODE_TLS_REJECT_UNAUTHORIZED=0`

**E2E Test Backends:**
1. **Loki** (3 tests) - Log aggregation via OTLP
2. **Tempo** (4 tests) - Distributed tracing with tail sampling
3. **Prometheus** (6 tests) - Metrics (pull/scrape + push/remote write)
4. **Local OTEL** (6 tests) - Local collector health checks

**Important E2E Testing Patterns:**

1. **Global MeterProvider Isolation**: Tests use `metricsApi.disable()` in `afterAll` hooks to prevent test pollution
2. **Force Flush**: Tests use `sdk.forceFlush()` to bypass export intervals before querying backends
3. **Wait Times**: Tests wait for pipeline delays (Loki: 12s, Tempo: 20s, Prometheus: 30s)
4. **Unique Test IDs**: All tests generate unique IDs to avoid cross-test interference

See `tests/e2e/DEBUG.md` for infrastructure details and debugging.

## OTEL Collector Resource Processor

**CRITICAL**: E2E tests expect specific resource attribute behavior from the OTEL collector:

```yaml
resource:
  attributes:
    - key: service.name
      action: insert        # Preserves SDK value (e.g., "e2e-loki-test")

    - key: service.version
      action: upsert        # Overrides with collector version ("0.128.0")

    - key: deployment.environment
      action: upsert        # Overrides with ${env:ENV} ("Dev")
```

**Test assertions must match this behavior:**
- `service.name` = SDK value (NOT "otel-collector")
- `service.version` = `"0.128.0"` (NOT SDK value)
- `deployment.environment` = `"Dev"` (NOT SDK value like "test" or "e2e")

## Common Development Tasks

### Adding a New Exporter

1. Create builder function in `src/utils/otel/exporters/{tracing|metrics}/`
2. Add to factory in `src/utils/otel/index.ts`
3. Add unit tests in `tests/unit/otel/exporters/`
4. Update types in `src/utils/otel/types.ts`

### Adding a New Logger Transport

1. Create transport builder in `src/utils/logger/transports/`
2. Export from `src/utils/logger/index.ts`
3. Add unit tests with mocked streams
4. Add integration tests with real streams
5. Update types if needed

### Modifying E2E Tests

1. **Never skip tests permanently** - Comment with reason if temporary
2. **Use unique test IDs** - `test-${Date.now()}-${Math.random().toString(36).substring(7)}`
3. **Clean up global state** - Always call `metricsApi.disable()` in `afterAll`
4. **Force flush before queries** - Call `await sdk.forceFlush()` before querying backends
5. **Respect pipeline delays** - Wait appropriate times for ingestion

### Updating OTEL Collector Config

If the OTEL collector configuration changes (especially resource processor):

1. Update `tests/e2e/README.md` with new resource attribute behavior
2. Update test assertions to match actual backend data
3. Run E2E tests to validate: `NODE_TLS_REJECT_UNAUTHORIZED=0 pnpm test:e2e`
4. Document changes in test file comments

## Key Implementation Details

### SDK Wrapper Implementation

The `forceFlush()` method accesses internal `_meterProvider`:

```typescript
forceFlush: async (): Promise<void> => {
  const meterProvider = (sdk as any)._meterProvider
  if (meterProvider && typeof meterProvider.forceFlush === 'function') {
    await meterProvider.forceFlush()
  }
}
```

This is necessary because `NodeSDK` doesn't expose `forceFlush()` directly. The implementation is type-safe via the `TelemetrySDK` interface.

### Graceful Shutdown

The `setupGracefulShutdown()` utility registers SIGTERM/SIGINT handlers:

```typescript
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Shutting down gracefully...')
  await sdk.shutdown()
  process.exit(0)
})
```

**Important**: Graceful shutdown is automatically configured when calling `createTelemetry()`. No manual setup required.

### Test Isolation (Metrics)

OpenTelemetry uses a **global MeterProvider**. To prevent test interference:

```typescript
import { metrics as metricsApi } from '@opentelemetry/api'

afterAll(async () => {
  if (sdk) {
    await sdk.shutdown()
    metricsApi.disable()  // CRITICAL: Unregister global MeterProvider
  }
})
```

Without `metricsApi.disable()`, subsequent tests fail because `metricsApi.getMeter()` returns the OLD global provider instead of the new SDK's provider.

### File Transport Worker Threads

The file transport uses Pino's worker threads for async I/O. In tests, these threads continue after test completion, causing ENOENT errors when cleanup removes directories.

**Solution**: Integration tests for file I/O use temporary directories and proper cleanup timing.

## TypeScript Configuration

This package uses:
- **Module**: ESNext
- **Module Resolution**: bundler (required for ESM)
- **Target**: ES2022
- **Strict mode**: Enabled

Consuming projects must use compatible settings:
```json
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true
  }
}
```

## Production Deployment

### Infrastructure Stack

RecoverySky uses these observability backends (hosted on `metis.prod.rso`):
- **Grafana Loki** - Log aggregation (port 3100)
- **Grafana Tempo** - Distributed tracing (ports 3200/3217/3218)
- **Prometheus** - Metrics collection (port 9090)
- **OTEL Collector** - Telemetry pipeline (ports 4317/4318)
- **Caddy** - Reverse proxy with self-signed TLS

### Environment Variables

**Required for E2E tests:**
```bash
NODE_TLS_REJECT_UNAUTHORIZED=0  # Self-signed certs
```

**OTEL configuration:**
```bash
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces
OTEL_EXPORTER_OTLP_HEADERS='{"x-honeycomb-team":"YOUR_API_KEY"}'
JAEGER_ENDPOINT=http://localhost:14268/api/traces
```

**Logger configuration:**
```bash
LOG_LEVEL=info
```

## Troubleshooting

### E2E Tests Failing

1. Check VPN connection: `dig tempo.rso +short`
2. Verify OTEL collector: `docker ps | grep recoverysky-otel`
3. Check backend health:
   ```bash
   curl -k https://loki.rso:3100/ready
   curl -k https://tempo.rso:3200/ready
   curl -k https://prometheus.rso:9090/-/healthy
   ```
4. See `tests/e2e/DEBUG.md` for detailed troubleshooting

### TypeScript Build Errors

1. Check module resolution: Must use `moduleResolution: "bundler"`
2. Verify ESM imports (no `.js` extensions in source)
3. Ensure `dist/` is cleaned before build: `rm -rf dist && pnpm build`

### Test Pollution (Metrics)

If metrics tests fail after running other tests:
1. Check for missing `metricsApi.disable()` in `afterAll` hooks
2. Run test in isolation: `pnpm test tests/e2e/metrics.test.ts`
3. Verify only ONE test has `in_progress` metrics at a time

## Documentation

- [OpenTelemetry Guide](./src/utils/otel/README.md) - Detailed OTEL usage and configuration
- [Logger Guide](./src/utils/logger/README.md) - Pino logging setup and plugins
- [E2E Tests](./tests/e2e/README.md) - Production pipeline validation
- [E2E Debugging](./tests/e2e/DEBUG.md) - Infrastructure debugging guide
- [Integration Tests](./tests/integration/README.md) - Logger integration testing

## Version History

### v0.0.1 (Current)
- Initial release
- OpenTelemetry SDK factory with multiple exporters
- Pino logger with OTEL transport and trace context
- 319 tests passing (unit + integration + E2E)
- Production deployment on RecoverySky infrastructure

# Testing Guide

Guide to testing applications using Wonder Logger.

## Overview

Wonder Logger is designed to be easily testable with comprehensive test utilities and patterns.

## Test Utilities

### Memory Transport

The memory transport stores logs in memory for test assertions:

```typescript
import { createLogger, createMemoryTransport, getMemoryLogs } from '@jenova-marie/wonder-logger'

describe('My App', () => {
  let logger: pino.Logger

  beforeEach(() => {
    logger = createLogger({
      name: 'test',
      level: 'debug',
      transport: [createMemoryTransport({ name: 'test-logs', maxSize: 1000 })]
    })
  })

  it('should log errors', () => {
    logger.error({ code: 'ERR_001' }, 'Something failed')

    const logs = getMemoryLogs('test-logs', { format: 'parsed' })
    expect(logs).toHaveLength(1)
    expect(logs[0].level).toBe('error')
    expect(logs[0].code).toBe('ERR_001')
  })

  afterEach(() => {
    clearMemoryLogs('test-logs')
  })
})
```

### Disable Telemetry in Tests

```typescript
import { createTelemetry } from '@jenova-marie/wonder-logger'

const sdk = createTelemetry({
  serviceName: 'test',
  tracing: { enabled: false },
  metrics: { enabled: false }
})
```

### Mock File System for Config Tests

```typescript
import { vol } from 'memfs'
import { loadConfig } from '@jenova-marie/wonder-logger'

vi.mock('fs/promises', () => memfs.promises)

it('should load config from file', () => {
  vol.fromJSON({
    '/app/wonder-logger.yaml': `
      service:
        name: test-service
      logger:
        level: debug
    `
  })

  const result = loadConfig({ configPath: '/app/wonder-logger.yaml' })
  expect(result.ok).toBe(true)
})
```

## Test Patterns

### Unit Testing

See **[tests/unit/](../tests/unit/)** for comprehensive unit test examples.

### Integration Testing

See **[tests/integration/README.md](../tests/integration/README.md)** for integration testing patterns with real logger behavior.

### E2E Testing

See **[tests/e2e/README.md](../tests/e2e/README.md)** for E2E testing with production observability stack (Loki, Tempo, Prometheus).

## Running Tests

```bash
# All tests
pnpm test

# By category
pnpm test:unit
pnpm test:integration
pnpm test:e2e

# With coverage
pnpm test:coverage
pnpm test:unit:coverage

# Watch mode
pnpm test:watch
```

## Further Reading

- **[tests/integration/README.md](../tests/integration/README.md)** - Integration test guide
- **[tests/e2e/README.md](../tests/e2e/README.md)** - E2E test guide
- **[tests/e2e/DEBUG.md](../tests/e2e/DEBUG.md)** - Infrastructure debugging

---

**Version**: 2.0.0
**Last Updated**: October 2025

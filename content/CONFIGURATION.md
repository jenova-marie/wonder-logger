# Configuration System

Wonder Logger uses a YAML-based configuration system with environment variable interpolation, schema validation, and config-driven factory functions.

## Quick Start

**1. Create `wonder-logger.yaml` in your project root:**

```yaml
service:
  name: ${SERVICE_NAME:-my-api}
  version: ${SERVICE_VERSION:-1.0.0}
  environment: ${NODE_ENV:-development}

logger:
  enabled: true
  level: ${LOG_LEVEL:-info}
  transports:
    - type: console
      pretty: ${LOG_PRETTY:-false}

otel:
  enabled: true
  tracing:
    enabled: true
    exporter: otlp
    endpoint: ${OTEL_TRACES_ENDPOINT:-http://localhost:4318/v1/traces}
```

**2. Load configuration:**

```typescript
import { loadConfig } from '@jenova-marie/wonder-logger'

const result = loadConfig()

if (result.ok) {
  const config = result.value
  console.log('Service:', config.service.name)
} else {
  console.error('Config error:', result.error.message)
  process.exit(1)
}
```

## Environment Variable Interpolation

### Syntax

```yaml
# Required variable (error if not set)
service:
  name: ${SERVICE_NAME}

# Optional variable with default
service:
  name: ${SERVICE_NAME:-my-api}
  version: ${npm_package_version:-1.0.0}
```

### Examples

```yaml
# Simple substitution
logger:
  level: ${LOG_LEVEL}  # Uses LOG_LEVEL env var

# With default
logger:
  level: ${LOG_LEVEL:-info}  # Uses LOG_LEVEL or 'info'

# Boolean values
logger:
  enabled: ${LOGGER_ENABLED:-true}

# Numeric values
otel:
  metrics:
    exporters:
      - type: prometheus
        port: ${PROMETHEUS_PORT:-9464}
```

## Config-Driven Factory Functions

### Create Logger from Config

```typescript
import { createLoggerFromConfig } from '@jenova-marie/wonder-logger'

// Load from default location
const logger = createLoggerFromConfig()

// Custom config path
const logger = createLoggerFromConfig({
  configPath: './config/production.yaml'
})

// With overrides
const logger = createLoggerFromConfig({
  overrides: {
    level: 'debug'  // Override config file
  }
})

logger.info('Logger ready')
```

### Create Telemetry from Config

```typescript
import { createTelemetryFromConfig } from '@jenova-marie/wonder-logger'

const sdk = createTelemetryFromConfig()

// SDK is automatically started
// Graceful shutdown handlers registered

process.on('SIGTERM', async () => {
  await sdk.shutdown()
  process.exit(0)
})
```

## Schema Validation

Configurations are validated using Zod schemas. Validation errors provide helpful messages:

```typescript
const result = loadConfig()

if (!result.ok && result.error.kind === 'SchemaValidation') {
  console.error('Validation errors:')
  result.error.context.issues.forEach(issue => {
    console.error(`  ${issue.path.join('.')}: ${issue.message}`)
  })
}
```

Example validation error:

```
Validation errors:
  logger.level: Invalid enum value. Expected 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal', received 'verbose'
  otel.tracing.sampleRate: Number must be less than or equal to 1
```

## Relative Paths

File paths in configuration are resolved relative to the config file location:

```yaml
# In /app/config/wonder-logger.yaml
logger:
  transports:
    - type: file
      dir: ./logs              # Resolves to /app/config/logs
      fileName: app.log
```

## Multi-Environment Setup

### Option 1: Separate Config Files

```bash
config/
├── development.yaml
├── staging.yaml
└── production.yaml
```

```typescript
const env = process.env.NODE_ENV || 'development'
const result = loadConfig({
  configPath: `./config/${env}.yaml`
})
```

### Option 2: Environment Variables

```yaml
# config.yaml
service:
  name: ${SERVICE_NAME}

logger:
  level: ${LOG_LEVEL}  # Different per environment

otel:
  tracing:
    endpoint: ${OTEL_ENDPOINT}  # Different per environment
```

```bash
# .env.development
SERVICE_NAME=my-api-dev
LOG_LEVEL=debug
OTEL_ENDPOINT=http://localhost:4318/v1/traces

# .env.production
SERVICE_NAME=my-api
LOG_LEVEL=info
OTEL_ENDPOINT=https://otel.prod.example.com/v1/traces
```

## Complete Configuration Example

See [wonder-logger.example.yaml](../wonder-logger.example.yaml) for a complete, production-ready configuration with all options documented.

## Programmatic API

For programmatic configuration without YAML files:

```typescript
import { createLogger, createTelemetry } from '@jenova-marie/wonder-logger'

const logger = createLogger({
  name: 'my-api',
  level: 'info',
  transport: [
    { target: 'pino/file', options: { destination: './logs/app.log' } }
  ]
})

const sdk = createTelemetry({
  serviceName: 'my-api',
  tracing: {
    exporter: 'otlp',
    endpoint: 'http://localhost:4318/v1/traces'
  }
})
```

## Further Reading

- **[src/utils/config/README.md](../src/utils/config/README.md)** - Detailed configuration system documentation
- **[content/ERROR_HANDLING.md](./ERROR_HANDLING.md)** - Result types and error handling
- **[wonder-logger.example.yaml](../wonder-logger.example.yaml)** - Complete configuration example

---

**Version**: 2.0.0
**Last Updated**: October 2025

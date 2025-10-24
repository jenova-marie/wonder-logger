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
  enabled: true  # Boolean literal (NOT ${LOGGER_ENABLED:-true})
  level: ${LOG_LEVEL:-info}
  transports:
    - type: console
      pretty: false  # Boolean literal (NOT ${LOG_PRETTY:-false})

otel:
  enabled: true  # Boolean literal (NOT ${OTEL_ENABLED:-true})
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

| Syntax | Behavior | Example |
|--------|----------|---------|
| `${VAR_NAME}` | **Required variable** - Throws error if not set | `${SERVICE_NAME}` |
| `${VAR_NAME:-default}` | **Optional variable** - Uses default if not set | `${LOG_LEVEL:-info}` |

### ⚠️ CRITICAL: Type Safety Limitations

**Environment variable interpolation ONLY works with string values.** YAML types (booleans, numbers, arrays, objects) **MUST use literal values**, not environment variable syntax.

#### ✅ CORRECT Usage

```yaml
# Strings - interpolation works
service:
  name: ${SERVICE_NAME:-my-api}
  version: ${npm_package_version:-1.0.0}
  environment: ${NODE_ENV:-development}

logger:
  level: ${LOG_LEVEL:-info}  # String enum value - works!

otel:
  tracing:
    exporter: ${OTEL_TRACE_EXPORTER:-otlp}  # String enum value - works!
    endpoint: ${OTEL_TRACES_ENDPOINT:-http://localhost:4318/v1/traces}

# Booleans, numbers - use literals
logger:
  enabled: true  # Boolean literal
  transports:
    - type: console
      pretty: false  # Boolean literal

otel:
  enabled: true  # Boolean literal
  metrics:
    exporters:
      - type: prometheus
        port: 9464  # Number literal
```

#### ❌ INCORRECT Usage

```yaml
# DO NOT USE environment variable syntax for booleans/numbers!
logger:
  enabled: ${LOGGER_ENABLED:-true}  # ❌ ERROR: expected boolean, received string
  transports:
    - type: console
      pretty: ${LOG_PRETTY:-false}  # ❌ ERROR: expected boolean, received string

otel:
  enabled: ${OTEL_ENABLED:-true}  # ❌ ERROR: expected boolean, received string
  tracing:
    sampleRate: ${SAMPLE_RATE:-1.0}  # ❌ ERROR: expected number, received string
  metrics:
    exporters:
      - type: prometheus
        port: ${PROMETHEUS_PORT:-9464}  # ❌ ERROR: expected number, received string
```

**Why this fails:**
1. YAML parser reads `${LOG_PRETTY:-false}` as the string `"${LOG_PRETTY:-false}"`
2. Environment variable substitution converts it to the string `"false"` (not boolean `false`)
3. Zod schema expects `boolean`, receives `string`, validation fails

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

### Common Validation Errors

#### Type Mismatch (Boolean)

**Error:**
```
Invalid input: expected boolean, received string
```

**Cause:** Using environment variable syntax for booleans.

**Fix:**
```yaml
# ❌ WRONG
logger:
  enabled: ${LOGGER_ENABLED:-true}

# ✅ CORRECT
logger:
  enabled: true
```

#### Type Mismatch (Number)

**Error:**
```
Invalid input: expected number, received string
```

**Cause:** Using environment variable syntax for numbers.

**Fix:**
```yaml
# ❌ WRONG
otel:
  metrics:
    exporters:
      - type: prometheus
        port: ${PROMETHEUS_PORT:-9464}

# ✅ CORRECT
otel:
  metrics:
    exporters:
      - type: prometheus
        port: 9464
```

#### Invalid Enum Value

**Error:**
```
Invalid enum value. Expected 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal', received 'verbose'
```

**Fix:**
```yaml
# ❌ WRONG
logger:
  level: verbose

# ✅ CORRECT
logger:
  level: debug  # Valid values: trace, debug, info, warn, error, fatal, silent
```

### Debugging Validation Errors

Create a debug script to extract detailed validation errors:

```typescript
// debug-config.mjs
import { loadConfig } from '@jenova-marie/wonder-logger'

const configResult = loadConfig({ configPath: './wonder-logger.yaml' })

if (!configResult.ok) {
  const error = configResult.error

  if (error.context && error.context.issues) {
    console.error('❌ Validation Errors:\n')
    error.context.issues.forEach((issue, index) => {
      console.log(`${index + 1}. Error at path: ${issue.path.join('.')}`)
      console.log(`   Message: ${issue.message}\n`)
    })
  } else {
    console.error('Error:', error.message)
  }

  process.exit(1)
}

console.log('✅ Configuration valid!')
```

**Run:**
```bash
node debug-config.mjs
```

Example output:
```
❌ Validation Errors:

1. Error at path: logger.transports.0.pretty
   Message: Invalid input: expected boolean, received string

2. Error at path: otel.enabled
   Message: Invalid input: expected boolean, received string

3. Error at path: otel.metrics.exporters.0.port
   Message: Invalid input: expected number, received string
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

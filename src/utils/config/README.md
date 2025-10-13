# Configuration System

The configuration system provides YAML-based configuration for Star Logger with environment variable interpolation, Zod validation, and fail-fast error handling.

## Table of Contents

- [Quick Start](#quick-start)
- [Configuration File](#configuration-file)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Configuration Schema](#configuration-schema)
- [Validation](#validation)
- [Examples](#examples)

## Quick Start

### 1. Create Configuration File

Create a `wonder-logger.yaml` file in your project root:

```yaml
service:
  name: my-api
  version: 1.0.0
  environment: development

logger:
  enabled: true
  level: info
  transports:
    - type: console
      pretty: true

otel:
  enabled: true
  tracing:
    enabled: true
    exporter: console
```

### 2. Load Configuration

```typescript
import { loadConfig } from '@recoverysky/wonder-logger'

// Load from default location (wonder-logger.yaml in cwd)
const config = loadConfig()

// Load from custom path
const config = loadConfig({ configPath: './config/custom.yaml' })

// Make config optional (returns null if not found)
const config = loadConfig({ required: false })
```

### 3. Use Config-Driven Factories

```typescript
import { createLoggerFromConfig, createTelemetryFromConfig } from '@recoverysky/wonder-logger'

// Create logger from config
const logger = createLoggerFromConfig()

// Create OpenTelemetry SDK from config
const sdk = createTelemetryFromConfig()

// With runtime overrides
const logger = createLoggerFromConfig({
  overrides: { level: 'debug' }
})

const sdk = createTelemetryFromConfig({
  overrides: {
    serviceName: 'override-service',
    environment: 'staging'
  }
})
```

## Configuration File

### File Discovery

The config loader searches for `wonder-logger.yaml` in the current working directory (`process.cwd()`).

### File Format

The configuration file uses YAML format with support for:
- Environment variable interpolation
- Comments and documentation
- Multi-line strings
- Nested objects and arrays

### Full Example

See [wonder-logger.yaml](../../../wonder-logger.yaml) in the project root for a comprehensive example with all available options documented.

## Environment Variables

### Interpolation Syntax

The config parser supports two forms of environment variable interpolation:

#### Required Variables

```yaml
service:
  name: ${SERVICE_NAME}  # Throws error if SERVICE_NAME is not set
```

#### Optional Variables with Defaults

```yaml
service:
  name: ${SERVICE_NAME:-my-api}  # Uses 'my-api' if SERVICE_NAME is not set
  version: ${SERVICE_VERSION:-1.0.0}
```

### Common Environment Variables

```bash
# Service metadata
SERVICE_NAME=my-api
SERVICE_VERSION=1.0.0
NODE_ENV=production

# Logger
LOG_LEVEL=info
LOG_PRETTY=false

# OpenTelemetry endpoints
OTEL_TRACES_ENDPOINT=http://localhost:4318/v1/traces
OTEL_METRICS_ENDPOINT=http://localhost:4318/v1/metrics
OTEL_LOGS_ENDPOINT=http://localhost:4318/v1/logs

# Metrics
PROMETHEUS_PORT=9464

# Trace exporter
OTEL_TRACE_EXPORTER=otlp
```

## API Reference

### loadConfig()

Loads and validates configuration from a YAML file.

```typescript
function loadConfig(options?: {
  configPath?: string  // Custom config file path
  required?: boolean   // Whether config is required (default: true)
}): WonderLoggerConfig | null
```

**Returns:**
- `WonderLoggerConfig` - Validated configuration object
- `null` - If config not found and `required: false`

**Throws:**
- `Error` - If config file not found and `required: true`
- `ZodError` - If config validation fails
- `Error` - If required environment variable is missing

**Example:**

```typescript
import { loadConfig } from '@recoverysky/wonder-logger'

try {
  const config = loadConfig()
  console.log('Config loaded:', config.service.name)
} catch (error) {
  console.error('Failed to load config:', error)
  process.exit(1)
}
```

### loadConfigFromFile()

Loads configuration from a specific file path.

```typescript
function loadConfigFromFile(filePath: string): WonderLoggerConfig
```

**Parameters:**
- `filePath` - Absolute or relative path to YAML config file

**Returns:**
- `WonderLoggerConfig` - Validated configuration object

**Throws:**
- `Error` - If file doesn't exist or can't be read
- `ZodError` - If validation fails

**Example:**

```typescript
import { loadConfigFromFile } from '@recoverysky/wonder-logger'

const config = loadConfigFromFile('./config/production.yaml')
```

### findConfigFile()

Searches for a config file in the current working directory.

```typescript
function findConfigFile(fileName?: string): string | null
```

**Parameters:**
- `fileName` - Config file name (default: `'wonder-logger.yaml'`)

**Returns:**
- `string` - Absolute path to config file
- `null` - If file not found

**Example:**

```typescript
import { findConfigFile } from '@recoverysky/wonder-logger'

const configPath = findConfigFile()
if (configPath) {
  console.log('Found config at:', configPath)
} else {
  console.log('No config file found')
}
```

### parseYamlWithEnv()

Parses YAML content with environment variable interpolation.

```typescript
function parseYamlWithEnv(yamlContent: string): any
```

**Parameters:**
- `yamlContent` - Raw YAML string

**Returns:**
- Parsed JavaScript object with interpolated environment variables

**Throws:**
- `Error` - If required environment variable is missing
- `Error` - If YAML syntax is invalid

**Example:**

```typescript
import { parseYamlWithEnv } from '@recoverysky/wonder-logger'

const yaml = `
service:
  name: \${SERVICE_NAME:-default-service}
  version: \${VERSION}
`

const config = parseYamlWithEnv(yaml)
```

## Configuration Schema

### Root Schema

```typescript
interface WonderLoggerConfig {
  service: ServiceConfig
  logger?: LoggerConfig
  otel?: OtelConfig
}
```

### Service Configuration

```typescript
interface ServiceConfig {
  name: string           // Service name (required)
  version?: string       // Service version (default: '1.0.0')
  environment?: string   // Deployment environment (default: 'development')
}
```

**Example:**

```yaml
service:
  name: my-api
  version: 2.3.1
  environment: production
```

### Logger Configuration

```typescript
interface LoggerConfig {
  enabled?: boolean                    // Enable logger (default: true)
  level?: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal' | 'silent'
  redact?: string[]                    // Fields to redact (default: [])
  transports?: TransportConfig[]       // Transport configurations
  plugins?: LoggerPluginsConfig        // Plugin settings
}

interface LoggerPluginsConfig {
  traceContext?: boolean   // Inject OTEL trace context (default: false)
  morganStream?: boolean   // Enable Morgan stream adapter (default: false)
}
```

**Example:**

```yaml
logger:
  enabled: true
  level: info
  redact:
    - password
    - token
    - apiKey
  transports:
    - type: console
      pretty: true
    - type: file
      dir: ./logs
      fileName: app.log
    - type: otel
      endpoint: http://localhost:4318/v1/logs
  plugins:
    traceContext: true
    morganStream: false
```

### Transport Configurations

#### Console Transport

```typescript
interface ConsoleTransportConfig {
  type: 'console'
  pretty?: boolean
  level?: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'
  prettyOptions?: {
    colorize?: boolean
    translateTime?: string
    ignore?: string
    singleLine?: boolean
  }
}
```

**Example:**

```yaml
- type: console
  pretty: true
  level: debug
  prettyOptions:
    colorize: true
    translateTime: 'yyyy-mm-dd HH:MM:ss'
    ignore: 'pid,hostname'
    singleLine: false
```

#### File Transport

```typescript
interface FileTransportConfig {
  type: 'file'
  dir?: string          // Directory path (default: './logs')
  fileName?: string     // File name (default: 'app.log')
  level?: string
  sync?: boolean        // Use sync I/O (default: false)
  mkdir?: boolean       // Create directory (default: true)
}
```

**Example:**

```yaml
- type: file
  dir: /var/log/myapp
  fileName: application.log
  level: info
  sync: false
  mkdir: true
```

#### OTEL Transport

```typescript
interface OtelTransportConfig {
  type: 'otel'
  endpoint?: string     // OTLP endpoint (default: 'http://localhost:4318/v1/logs')
  level?: string
  exportIntervalMillis?: number  // Export interval (default: 5000)
}
```

**Example:**

```yaml
- type: otel
  endpoint: https://otel-collector.example.com:4318/v1/logs
  level: info
  exportIntervalMillis: 10000
```

### OpenTelemetry Configuration

```typescript
interface OtelConfig {
  enabled?: boolean
  tracing?: TracingConfig
  metrics?: MetricsConfig
  instrumentation?: InstrumentationConfig
}
```

#### Tracing

```typescript
interface TracingConfig {
  enabled?: boolean
  exporter?: 'console' | 'otlp' | 'jaeger'
  endpoint?: string
  sampleRate?: number  // 0.0 to 1.0 (default: 1.0)
}
```

**Example:**

```yaml
tracing:
  enabled: true
  exporter: otlp
  endpoint: http://localhost:4318/v1/traces
  sampleRate: 1.0
```

#### Metrics

```typescript
interface MetricsConfig {
  enabled?: boolean
  exporters?: MetricsExporterConfig[]
  exportIntervalMillis?: number
}

type MetricsExporterConfig =
  | PrometheusExporterConfig
  | OtlpMetricsExporterConfig

interface PrometheusExporterConfig {
  type: 'prometheus'
  port?: number  // Default: 9464
}

interface OtlpMetricsExporterConfig {
  type: 'otlp'
  endpoint?: string                  // Default: 'http://localhost:4318/v1/metrics'
  exportIntervalMillis?: number      // Default: 60000
}
```

**Example:**

```yaml
metrics:
  enabled: true
  exporters:
    - type: prometheus
      port: 9090
    - type: otlp
      endpoint: http://localhost:4318/v1/metrics
      exportIntervalMillis: 30000
  exportIntervalMillis: 60000
```

#### Instrumentation

```typescript
interface InstrumentationConfig {
  auto?: boolean   // Enable auto-instrumentation (default: true)
  http?: boolean   // Include HTTP hooks (default: true)
}
```

**Example:**

```yaml
instrumentation:
  auto: true
  http: true
```

## Validation

The configuration system uses [Zod](https://github.com/colinhacks/zod) for schema validation with **fail-fast** behavior.

### Validation Errors

When validation fails, the config loader throws a `ZodError` with detailed error information:

```typescript
import { loadConfig } from '@recoverysky/wonder-logger'
import { ZodError } from 'zod'

try {
  const config = loadConfig()
} catch (error) {
  if (error instanceof ZodError) {
    console.error('Config validation failed:')
    error.errors.forEach((err) => {
      console.error(`  - ${err.path.join('.')}: ${err.message}`)
    })
  } else {
    console.error('Config error:', error.message)
  }
}
```

### Common Validation Errors

**Missing required fields:**

```
Config validation failed:
  - service.name: Service name is required
```

**Invalid enum value:**

```
Config validation failed:
  - logger.level: Invalid enum value. Expected 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal' | 'silent', received 'verbose'
```

**Invalid type:**

```
Config validation failed:
  - otel.tracing.sampleRate: Expected number, received string
```

**Range validation:**

```
Config validation failed:
  - otel.tracing.sampleRate: Number must be between 0 and 1
```

## Examples

### Development Setup

```yaml
# wonder-logger.yaml
service:
  name: ${SERVICE_NAME:-my-api}
  version: ${npm_package_version:-1.0.0}
  environment: development

logger:
  enabled: true
  level: debug
  transports:
    - type: console
      pretty: true
      prettyOptions:
        colorize: true
        translateTime: 'HH:MM:ss'
        singleLine: false

otel:
  enabled: true
  tracing:
    enabled: true
    exporter: console
  metrics:
    enabled: true
    exporters:
      - type: prometheus
        port: 9464
```

### Production Setup

```yaml
# wonder-logger.yaml
service:
  name: ${SERVICE_NAME}
  version: ${SERVICE_VERSION}
  environment: ${NODE_ENV:-production}

logger:
  enabled: true
  level: ${LOG_LEVEL:-info}
  redact:
    - password
    - token
    - apiKey
    - secret
    - creditCard
  transports:
    - type: console
      pretty: false
    - type: otel
      endpoint: ${OTEL_LOGS_ENDPOINT}
      exportIntervalMillis: 5000
  plugins:
    traceContext: true

otel:
  enabled: true
  tracing:
    enabled: true
    exporter: otlp
    endpoint: ${OTEL_TRACES_ENDPOINT}
    sampleRate: ${TRACE_SAMPLE_RATE:-0.1}
  metrics:
    enabled: true
    exporters:
      - type: otlp
        endpoint: ${OTEL_METRICS_ENDPOINT}
        exportIntervalMillis: 60000
  instrumentation:
    auto: true
    http: true
```

### Testing Setup

```yaml
# config/test.yaml
service:
  name: test-service
  version: 1.0.0
  environment: test

logger:
  enabled: true
  level: silent  # Suppress logs in tests
  transports: []

otel:
  enabled: false  # Disable telemetry in tests
```

### Multi-Environment with Overrides

```typescript
import { createLoggerFromConfig, createTelemetryFromConfig } from '@recoverysky/wonder-logger'

const env = process.env.NODE_ENV || 'development'
const configPath = `./config/${env}.yaml`

// Load with environment-specific config
const logger = createLoggerFromConfig({
  configPath,
  required: false,  // Fall back to defaults if not found
  overrides: {
    // Runtime overrides from environment
    level: process.env.LOG_LEVEL as any,
  }
})

const sdk = createTelemetryFromConfig({
  configPath,
  required: false,
  overrides: {
    serviceName: process.env.SERVICE_NAME,
    environment: env,
  }
})
```

## Related Documentation

- [Logger Documentation](../logger/README.md) - Programmatic logger API
- [OpenTelemetry Documentation](../otel/README.md) - Programmatic OTEL API
- [Main README](../../../README.md) - Complete project documentation

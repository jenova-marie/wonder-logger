# ts-rust-result 2.0 Integration Plan

> **Status**: Planning Phase (Updated with ts-rust-result 2.0.1 capabilities)
> **Target**: Migrate wonder-logger to use ts-rust-result 2.0 for type-safe error handling
> **Scope**: This document is disposable and will be archived once implementation is complete

## ts-rust-result 2.0 - What We Have

### ✅ Already Implemented in ts-rust-result 2.0

**Core Result Type:**
- `ok(value)`, `err(error)` - Create Result values
- `Result<T, E>` - Discriminated union type
- Type guards: `result.ok`, `result.value`, `result.error`

**Error Infrastructure:**
- `DomainError` interface (kind, message, context, cause, stack, timestamp)
- Error builder: `error('Kind').withMessage('...').withContext({...}).withCause(...).build()`
- Factory shortcuts: `fileNotFound(path)`, `fileReadError(path, reason)`, `invalidJSON(input, parseError)`
- `fromError(error)` - Convert Error instances to DomainError
- `tryResultSafe(fn)` - Wrap async operations that throw

**Observability Integration:**
- `toLogContext(error)` - Convert to Pino/Winston log format
- `toSpanAttributes(error)` - OpenTelemetry span attributes
- `toMetricLabels(error)` - Prometheus metric labels
- `toSentryError(error)` - Convert to Error instance for Sentry

**Zod Integration:**
- `fromZodSafeParse(zodResult)` - Convert Zod validation to Result

### Package Exports

```typescript
// Core Result
import { ok, err, type Result } from '@jenova-marie/ts-rust-result'

// Error infrastructure
import {
  error,              // Builder
  fileNotFound,       // Factories
  fileReadError,
  invalidJSON,
  fromError,
  tryResultSafe,
  toSentryError
} from '@jenova-marie/ts-rust-result/errors'

// Observability
import {
  toLogContext,
  toSpanAttributes,
  toMetricLabels
} from '@jenova-marie/ts-rust-result/observability'

// Zod integration
import { fromZodSafeParse } from '@jenova-marie/ts-rust-result/zod'
```

## Implementation Strategy

### Phase 0: ✅ COMPLETE - ts-rust-result 2.0 is ready!

The error infrastructure we planned is already implemented in ts-rust-result 2.0.1:
- ✅ DomainError interface
- ✅ Error builder and factories
- ✅ Observability helpers (logging, tracing, metrics)
- ✅ Sentry integration
- ✅ Zod integration

**Action**: We can skip directly to wonder-logger integration!

---

### Phase 1: Config Loading Pipeline

**Goal**: Convert config loading to Result-based error handling using ts-rust-result 2.0

**Files to modify**:
- `src/utils/config/loader.ts`
- `src/utils/config/parser.ts`
- `src/utils/config/schema.ts`
- Create: `src/utils/config/errors.ts`

**Define Project-Specific Errors**:

```typescript
// src/utils/config/errors.ts
import { error, type DomainError } from '@jenova-marie/ts-rust-result/errors'

/**
 * Environment variable interpolation errors
 */
export const missingEnvVar = (varName: string, expression: string) =>
  error('MissingEnvVar')
    .withMessage(`Required environment variable '${varName}' is not set`)
    .withContext({ varName, expression })
    .build()

export const invalidEnvVarSyntax = (expression: string) =>
  error('InvalidEnvVarSyntax')
    .withMessage(`Invalid environment variable syntax: ${expression}`)
    .withContext({ expression })
    .build()

/**
 * Config error type (union of all possible config errors)
 */
export type ConfigError = DomainError & {
  kind:
    | 'FileNotFound'           // From ts-rust-result/errors
    | 'FileReadError'          // From ts-rust-result/errors
    | 'InvalidYAML'            // From ts-rust-result/errors
    | 'SchemaValidation'       // From ts-rust-result/errors (via Zod)
    | 'MissingEnvVar'          // Project-specific
    | 'InvalidEnvVarSyntax'    // Project-specific
}
```

**Update parser.ts**:

```typescript
// src/utils/config/parser.ts
import { ok, err, type Result } from '@jenova-marie/ts-rust-result'
import { tryResultSafe, invalidYAML } from '@jenova-marie/ts-rust-result/errors'
import { parse as parseYAML } from 'yaml'
import { missingEnvVar, invalidEnvVarSyntax, type ConfigError } from './errors.js'

/**
 * Interpolate environment variables in a string
 */
export function interpolateEnvVars(value: string): Result<string, ConfigError> {
  const envVarRegex = /\$\{([^}:]+)(?::-(.*?))?\}/g

  try {
    const result = value.replace(envVarRegex, (match, varName, defaultValue) => {
      const envValue = process.env[varName]

      if (envValue !== undefined) {
        return envValue
      }

      if (defaultValue !== undefined) {
        return defaultValue
      }

      // This will be caught and converted to Result
      throw missingEnvVar(varName, match)
    })

    return ok(result)
  } catch (error) {
    return err(error as ConfigError)
  }
}

/**
 * Parse YAML with env var interpolation
 */
export function parseYamlWithEnv(yamlContent: string): Result<unknown, ConfigError> {
  // Try to parse YAML
  const parseResult = tryResultSafe(async () => parseYAML(yamlContent))

  if (!parseResult.ok) {
    // Convert Error to DomainError with proper context
    const yamlError = parseResult.error as any
    return err(
      invalidYAML(yamlContent, yamlError.message || String(yamlError))
    )
  }

  // Interpolate environment variables recursively
  return interpolateObject(parseResult.value)
}

function interpolateObject(obj: any): Result<any, ConfigError> {
  if (typeof obj === 'string') {
    return interpolateEnvVars(obj)
  }

  if (Array.isArray(obj)) {
    const results = obj.map(item => interpolateObject(item))
    const firstError = results.find(r => !r.ok)
    if (firstError && !firstError.ok) {
      return firstError
    }
    return ok(results.map(r => r.ok ? r.value : null))
  }

  if (obj !== null && typeof obj === 'object') {
    const result: any = {}
    for (const [key, value] of Object.entries(obj)) {
      const interpolated = interpolateObject(value)
      if (!interpolated.ok) {
        return interpolated
      }
      result[key] = interpolated.value
    }
    return ok(result)
  }

  return ok(obj)
}
```

**Update loader.ts**:

```typescript
// src/utils/config/loader.ts
import fs from 'fs'
import path from 'path'
import { ok, err, type Result } from '@jenova-marie/ts-rust-result'
import { fileNotFound, fileReadError } from '@jenova-marie/ts-rust-result/errors'
import { fromZodSafeParse } from '@jenova-marie/ts-rust-result/zod'
import { parseYamlWithEnv } from './parser.js'
import { configSchema, type WonderLoggerConfig } from './schema.js'
import { type ConfigError } from './errors.js'

export const DEFAULT_CONFIG_FILE = 'wonder-logger.yaml'

/**
 * Find config file in current working directory
 */
export function findConfigFile(fileName: string = DEFAULT_CONFIG_FILE): Result<string, ConfigError> {
  const configPath = path.resolve(process.cwd(), fileName)

  if (fs.existsSync(configPath)) {
    return ok(configPath)
  }

  return err(fileNotFound(configPath) as ConfigError)
}

/**
 * Load and validate config from file
 */
export function loadConfigFromFile(filePath: string): Result<WonderLoggerConfig, ConfigError> {
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    return err(fileNotFound(filePath) as ConfigError)
  }

  const configDir = path.dirname(path.resolve(filePath))

  // Read file
  let yamlContent: string
  try {
    yamlContent = fs.readFileSync(filePath, 'utf-8')
  } catch (error) {
    return err(
      fileReadError(
        filePath,
        error instanceof Error ? error.message : String(error)
      ) as ConfigError
    )
  }

  // Parse YAML with env vars
  const parseResult = parseYamlWithEnv(yamlContent)
  if (!parseResult.ok) {
    return parseResult
  }

  // Add config directory metadata
  const parsed = parseResult.value as any
  parsed._configDir = configDir

  // Validate with Zod
  const validationResult = fromZodSafeParse(configSchema.safeParse(parsed))

  return validationResult as Result<WonderLoggerConfig, ConfigError>
}

/**
 * Load config from default location or provided path
 */
export function loadConfig(options: {
  configPath?: string
  required?: boolean
} = {}): Result<WonderLoggerConfig | null, ConfigError> {
  const { configPath, required = true } = options

  const fileResult = configPath
    ? (fs.existsSync(configPath) ? ok(configPath) : err(fileNotFound(configPath) as ConfigError))
    : findConfigFile()

  if (!fileResult.ok) {
    if (required) {
      return fileResult
    }
    return ok(null)
  }

  return loadConfigFromFile(fileResult.value) as Result<WonderLoggerConfig | null, ConfigError>
}
```

**Update tests**:

```typescript
// tests/unit/config/loader.test.ts
import { describe, it, expect } from 'vitest'
import { findConfigFile, loadConfig } from '../../../src/utils/config/loader.js'

describe('Config Loader', () => {
  it('should return error when config file not found', () => {
    const result = findConfigFile('nonexistent.yaml')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.kind).toBe('FileNotFound')
      expect(result.error.context?.path).toContain('nonexistent.yaml')
    }
  })

  it('should return error for missing required env var', () => {
    const result = loadConfig({ configPath: './test-configs/missing-env.yaml' })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.kind).toBe('MissingEnvVar')
      expect(result.error.context?.varName).toBeTruthy()
    }
  })
})
```

**Deliverable**: Config loading returns `Result<Config, ConfigError>` with rich error context

---

### Phase 2: JSON Parser

**Goal**: Convert JSON parser to Result-based error handling

**Files to modify**:
- `src/utils/jsonParser.ts`

**Implementation**:

```typescript
// src/utils/jsonParser.ts
import { ok, err, type Result } from '@jenova-marie/ts-rust-result'
import { invalidJSON, type DomainError } from '@jenova-marie/ts-rust-result/errors'

type ParseError = DomainError & { kind: 'InvalidJSON' }

/**
 * Extract JSON from text that may contain additional content
 */
export function extractJSON(text: string): string {
  // ... existing implementation
}

/**
 * Sanitize JSON string
 */
function sanitizeJSON(text: string): string {
  // ... existing implementation
}

/**
 * Parse JSON with robust error handling
 */
export function parseJSONResponse<T = any>(text: string): Result<T, ParseError> {
  // First attempt: sanitize and parse directly
  try {
    const sanitized = sanitizeJSON(text)
    const parsed = JSON.parse(sanitized)
    return ok(parsed)
  } catch (firstError) {
    // Second attempt: extract then parse
    try {
      const extracted = extractJSON(text)
      const sanitized = sanitizeJSON(extracted)
      const parsed = JSON.parse(sanitized)
      return ok(parsed)
    } catch (secondError) {
      // Both failed - return detailed error
      return err(
        invalidJSON(
          text.substring(0, 100),
          `Direct parse: ${firstError instanceof Error ? firstError.message : 'Unknown'}. ` +
          `Extract parse: ${secondError instanceof Error ? secondError.message : 'Unknown'}`
        ) as ParseError
      )
    }
  }
}
```

**Deliverable**: JSON parser returns `Result<T, ParseError>`

---

### Phase 3: Logger Factory

**Goal**: Convert logger creation to Result-based error handling

**Files to modify**:
- `src/utils/logger/index.ts`
- `src/utils/logger/config.ts`
- Create: `src/utils/logger/errors.ts`

**Define Logger Errors**:

```typescript
// src/utils/logger/errors.ts
import { error, type DomainError } from '@jenova-marie/ts-rust-result/errors'

export const transportInitFailed = (transport: string, reason: string) =>
  error('TransportInitFailed')
    .withMessage(`Failed to initialize ${transport} transport: ${reason}`)
    .withContext({ transport, reason })
    .build()

export const pinoWorkerCrashed = (workerError: string) =>
  error('PinoWorkerCrashed')
    .withMessage(`Pino worker thread crashed: ${workerError}`)
    .withContext({ workerError })
    .build()

export type LoggerError = DomainError & {
  kind:
    | 'FileNotFound'
    | 'FileReadError'
    | 'FileWriteError'
    | 'SchemaValidation'
    | 'MissingEnvVar'
    | 'TransportInitFailed'
    | 'PinoWorkerCrashed'
}
```

**Update logger factory**:

```typescript
// src/utils/logger/index.ts
import { ok, err, type Result } from '@jenova-marie/ts-rust-result'
import { toLogContext } from '@jenova-marie/ts-rust-result/observability'
import pino from 'pino'
import type { LoggerError } from './errors.js'

export function createLogger(options: LoggerOptions): Result<pino.Logger, LoggerError> {
  try {
    // Transport creation
    const transports = options.transports?.map(t => {
      // Individual transport creation wrapped in try-catch
      // Returns Result<StreamEntry, TransportError>
    }) || []

    const logger = pino({
      name: options.name,
      level: options.level || 'info',
      // ... rest of config
    })

    return ok(logger)
  } catch (error) {
    return err(fromError(error) as LoggerError)
  }
}
```

**Usage with observability**:

```typescript
const loggerResult = createLogger({ name: 'api' })

if (!loggerResult.ok) {
  // Log the error using its own structured format
  console.error(JSON.stringify(toLogContext(loggerResult.error), null, 2))
  process.exit(1)
}

const logger = loggerResult.value
logger.info('Logger initialized successfully')
```

**Deliverable**: Logger factory returns `Result<Logger, LoggerError>`

---

### Phase 4: OTEL Factory

**Goal**: Convert OpenTelemetry factory to Result-based error handling

**Files to modify**:
- `src/utils/otel/index.ts`
- `src/utils/otel/config.ts`
- Create: `src/utils/otel/errors.ts`

**Define OTEL Errors**:

```typescript
// src/utils/otel/errors.ts
import { error, type DomainError } from '@jenova-marie/ts-rust-result/errors'

export const exporterInitFailed = (exporter: string, reason: string) =>
  error('ExporterInitFailed')
    .withMessage(`Failed to initialize ${exporter} exporter: ${reason}`)
    .withContext({ exporter, reason })
    .build()

export const sdkStartupFailed = (reason: string) =>
  error('SDKStartupFailed')
    .withMessage(`Failed to start OpenTelemetry SDK: ${reason}`)
    .withContext({ reason })
    .captureStack()  // Critical infrastructure failure - capture stack
    .build()

export type TelemetryError = DomainError & {
  kind:
    | 'ExporterInitFailed'
    | 'InvalidExporterConfig'
    | 'SDKStartupFailed'
    | 'SchemaValidation'
}
```

**Update OTEL factory**:

```typescript
// src/utils/otel/index.ts
import { ok, err, type Result } from '@jenova-marie/ts-rust-result'
import { tryResultSafe, fromError } from '@jenova-marie/ts-rust-result/errors'
import type { TelemetryError } from './errors.js'

export function createTelemetry(options: TelemetryOptions): Result<TelemetrySDK, TelemetryError> {
  try {
    // Build resources
    const resource = createResource({
      serviceName: options.serviceName,
      serviceVersion: options.serviceVersion,
      environment: options.environment
    })

    // Build exporters (each returns Result)
    const traceExporter = createTraceExporter(options.tracing)
    if (!traceExporter.ok) {
      return traceExporter
    }

    // Create SDK
    const sdk = new NodeSDK({
      resource,
      spanProcessor: new BatchSpanProcessor(traceExporter.value),
      // ... rest of config
    })

    // Start SDK
    sdk.start()
    setupGracefulShutdown(sdk)

    return ok({
      start: () => sdk.start(),
      shutdown: () => sdk.shutdown(),
      forceFlush: async () => {
        const meterProvider = (sdk as any)._meterProvider
        if (meterProvider?.forceFlush) {
          await meterProvider.forceFlush()
        }
      }
    })
  } catch (error) {
    return err(sdkStartupFailed(
      error instanceof Error ? error.message : String(error)
    ) as TelemetryError)
  }
}
```

**Deliverable**: OTEL factory returns `Result<TelemetrySDK, TelemetryError>`

---

### Phase 5: Public API & Observability Integration

**Goal**: Export error types and integrate observability helpers

**Files to modify**:
- `src/index.ts`

**Public API**:

```typescript
// src/index.ts

// Re-export ts-rust-result core
export { ok, err, type Result } from '@jenova-marie/ts-rust-result'

// Re-export error infrastructure
export {
  error,
  fileNotFound,
  fileReadError,
  invalidJSON,
  fromError,
  tryResultSafe,
  toSentryError,
  type DomainError
} from '@jenova-marie/ts-rust-result/errors'

// Re-export observability helpers
export {
  toLogContext,
  toSpanAttributes,
  toMetricLabels
} from '@jenova-marie/ts-rust-result/observability'

// Re-export Zod integration
export { fromZodSafeParse } from '@jenova-marie/ts-rust-result/zod'

// Export project-specific errors
export type { ConfigError } from './utils/config/errors.js'
export type { LoggerError } from './utils/logger/errors.js'
export type { TelemetryError } from './utils/otel/errors.js'

// Export factories (now return Result)
export { createLogger, createLoggerFromConfig } from './utils/logger/index.js'
export { createTelemetry, createTelemetryFromConfig } from './utils/otel/index.js'
export { loadConfig, loadConfigFromFile, findConfigFile } from './utils/config/loader.js'
```

**Example Usage**:

```typescript
import {
  createLogger,
  createTelemetry,
  toLogContext,
  toSpanAttributes,
  toMetricLabels
} from '@jenova-marie/wonder-logger'
import * as Sentry from '@sentry/node'
import pino from 'pino'

// Create logger
const loggerResult = createLogger({ name: 'api' })
if (!loggerResult.ok) {
  console.error(toLogContext(loggerResult.error))
  Sentry.captureException(toSentryError(loggerResult.error))
  process.exit(1)
}
const logger = loggerResult.value

// Create telemetry
const sdkResult = createTelemetry({ serviceName: 'api' })
if (!sdkResult.ok) {
  logger.error(toLogContext(sdkResult.error), 'Failed to initialize telemetry')

  // Record metric
  errorCounter.inc(toMetricLabels(sdkResult.error))

  // Add to span if in traced context
  const span = trace.getActiveSpan()
  if (span) {
    span.setAttributes(toSpanAttributes(sdkResult.error))
  }
}
```

**Deliverable**: Complete public API with Result types and observability integration

---

### Phase 6: Integration & E2E Tests

**Goal**: Update all tests to use Result-based APIs

**Test patterns**:

```typescript
// Before
describe('Config Loader', () => {
  it('should throw when config file not found', () => {
    expect(() => loadConfig()).toThrow('Config file not found')
  })
})

// After
describe('Config Loader', () => {
  it('should return error when config file not found', () => {
    const result = loadConfig()

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.kind).toBe('FileNotFound')
      expect(result.error.message).toContain('Config file not found')
      expect(result.error.context?.path).toBeTruthy()
    }
  })

  it('should serialize error for logging', () => {
    const result = loadConfig({ configPath: '/invalid/path.yaml' })

    if (!result.ok) {
      const logContext = toLogContext(result.error)

      expect(logContext.error_kind).toBe('FileNotFound')
      expect(logContext.error_message).toBeTruthy()
      expect(logContext.error_context).toBeTruthy()
    }
  })
})
```

**Deliverable**: All 319 tests passing with Result APIs

---

### Phase 7: Documentation

**Goal**: Complete documentation for Result-based error handling

**Files to create**:
- `content/ERROR_HANDLING.md` - Comprehensive error handling guide
- Update all existing README files

**Documentation structure**:

```markdown
# Error Handling with ts-rust-result 2.0

## Overview

wonder-logger uses ts-rust-result 2.0 for type-safe error handling. All factory functions return `Result<T, E>` instead of throwing exceptions.

## Quick Start

```typescript
import { createLogger, toLogContext } from 'wonder-logger'

const result = createLogger({ name: 'api' })

if (!result.ok) {
  // Error handling with observability
  console.error(toLogContext(result.error))
  process.exit(1)
}

const logger = result.value
logger.info('Logger created successfully')
```

## Error Types

All errors are discriminated unions based on `DomainError`:

- `ConfigError` - Configuration loading errors
- `LoggerError` - Logger initialization errors
- `TelemetryError` - OpenTelemetry SDK errors

## Observability Integration

### Structured Logging

```typescript
import { toLogContext } from 'wonder-logger'

if (!result.ok) {
  logger.error(toLogContext(result.error), 'Operation failed')
}
```

### Distributed Tracing

```typescript
import { toSpanAttributes } from 'wonder-logger'
import { trace } from '@opentelemetry/api'

const span = trace.getActiveSpan()
if (span && !result.ok) {
  span.setAttributes(toSpanAttributes(result.error))
}
```

### Metrics

```typescript
import { toMetricLabels } from 'wonder-logger'

if (!result.ok) {
  errorCounter.inc(toMetricLabels(result.error))
}
```

### Error Monitoring (Sentry)

```typescript
import { toSentryError } from 'wonder-logger'
import * as Sentry from '@sentry/node'

if (!result.ok) {
  Sentry.captureException(toSentryError(result.error))
}
```
```

**Deliverable**: Complete error handling documentation

---

### Phase 8: Migration & Release

**Goal**: Release wonder-logger v2.0.0

**Migration Guide**:

```typescript
// v1.x - Throws on error
try {
  const logger = createLogger({ name: 'api' })
  logger.info('Started')
} catch (err) {
  console.error('Failed to create logger:', err)
}

// v2.x - Returns Result
import { createLogger, toLogContext } from 'wonder-logger'

const result = createLogger({ name: 'api' })
if (!result.ok) {
  console.error(toLogContext(result.error))
  process.exit(1)
}

const logger = result.value
logger.info('Started')
```

**Deliverable**: wonder-logger v2.0.0 published

---

## Success Criteria

- ✅ All 319 tests passing
- ✅ All factory functions return `Result<T, E>`
- ✅ Error types properly documented and exported
- ✅ Observability integration (logging, tracing, metrics, Sentry)
- ✅ Complete migration guide
- ✅ No breaking changes to observability backend compatibility

## Next Steps

1. Start with Phase 1 (Config Loading Pipeline)
2. Validate pattern with integration tests
3. Proceed through remaining phases sequentially
4. Document learnings and patterns for RecoverySky-wide adoption

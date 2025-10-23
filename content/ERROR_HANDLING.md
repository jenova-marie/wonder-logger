# Error Handling with Result Types

Wonder Logger v2.0 introduces type-safe error handling using [ts-rust-result](https://github.com/jenova-marie/ts-rust-result). Config loading and JSON parsing functions return `Result<T, E>` types instead of throwing errors, enabling explicit error handling with full type safety.

## Table of Contents

- [Overview](#overview)
- [Result Type Basics](#result-type-basics)
- [Config Loading with Results](#config-loading-with-results)
- [JSON Parsing with Results](#json-parsing-with-results)
- [Error Types](#error-types)
- [Pattern Matching](#pattern-matching)
- [Observability Integration](#observability-integration)
- [Best Practices](#best-practices)

---

## Overview

### Why Result Types?

Traditional error handling in JavaScript/TypeScript has problems:
- **Unpredictable**: Functions might throw or return null/undefined
- **Type-unsafe**: TypeScript can't guarantee you've handled all errors
- **Context loss**: Stack traces lost when errors bubble up

Result types solve this by treating errors as values:
- **Explicit**: Return type shows a function can fail
- **Type-safe**: TypeScript forces you to handle both success and error cases
- **Contextual**: Errors carry structured context

### Breaking Changes in v2.0.0

```typescript
// ❌ v1.x (throws errors)
try {
  const config = loadConfig()
  console.log(config.service.name)
} catch (error) {
  console.error('Failed:', error)
}

// ✅ v2.0 (returns Result)
const result = loadConfig()
if (result.ok) {
  console.log(result.value.service.name)
} else {
  console.error('Failed:', result.error.message)
}
```

---

## Result Type Basics

### The Result Type

```typescript
type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E }
```

The `ok` property is the discriminator - TypeScript narrows the type based on it.

### Type Narrowing

```typescript
import { loadConfig, type ConfigResult } from '@jenova-marie/wonder-logger'

const result: ConfigResult<WonderLoggerConfig> = loadConfig()

if (result.ok) {
  // TypeScript knows result.value is WonderLoggerConfig
  const name: string = result.value.service.name
  console.log('Config loaded:', name)
} else {
  // TypeScript knows result.error is ConfigError
  const kind: string = result.error.kind
  console.error('Config error:', kind, result.error.message)
}
```

### Early Returns

```typescript
function initializeApp(): Result<App, ConfigError | InitError> {
  // Load config
  const configResult = loadConfig()
  if (!configResult.ok) {
    return configResult  // Early return with error
  }

  // Use config
  const config = configResult.value
  return ok(new App(config))
}
```

---

## Config Loading with Results

### Basic Usage

```typescript
import { loadConfig } from '@jenova-marie/wonder-logger'

// Load from default location (wonder-logger.yaml)
const result = loadConfig()

if (result.ok) {
  const config = result.value
  console.log('Service:', config.service.name)
} else {
  console.error('Config error:', result.error)
  process.exit(1)
}
```

### With Options

```typescript
import { loadConfig } from '@jenova-marie/wonder-logger'

// Custom config path
const result = loadConfig({
  configPath: './config/production.yaml',
  required: true  // Fail if file doesn't exist
})

if (!result.ok) {
  console.error('Failed to load config:', result.error.message)
  console.error('Context:', result.error.context)
}
```

### Loading from Specific File

```typescript
import { loadConfigFromFile } from '@jenova-marie/wonder-logger'

const result = loadConfigFromFile('/etc/wonder-logger/config.yaml')

if (result.ok) {
  console.log('Config loaded from:', '/etc/wonder-logger/config.yaml')
} else {
  switch (result.error.kind) {
    case 'FileNotFound':
      console.error('File not found:', result.error.context.path)
      break
    case 'InvalidYAML':
      console.error('YAML syntax error:', result.error.message)
      break
    case 'SchemaValidation':
      console.error('Validation failed:', result.error.context.issues)
      break
  }
}
```

### Finding Config File

```typescript
import { findConfigFile } from '@jenova-marie/wonder-logger'

const result = findConfigFile('my-config.yaml')

if (result.ok) {
  const path = result.value
  console.log('Config found at:', path)
} else {
  console.error('Config file not found')
}
```

---

## JSON Parsing with Results

### Parsing JSON

```typescript
import { parseJSONResponse } from '@jenova-marie/wonder-logger'

// Parse simple JSON
const jsonText = '{"status": "ok", "count": 42}'
const result = parseJSONResponse<{ status: string; count: number }>(jsonText)

if (result.ok) {
  console.log('Status:', result.value.status)
  console.log('Count:', result.value.count)
} else {
  console.error('Parse failed:', result.error.message)
}
```

### Parsing LLM Responses

```typescript
import { parseJSONResponse } from '@jenova-marie/wonder-logger'

// LLM response with explanation and code block
const llmResponse = `Here's the user data:

\`\`\`json
{
  "name": "Alice",
  "email": "alice@example.com"
}
\`\`\`

Hope this helps!`

const result = parseJSONResponse<{ name: string; email: string }>(llmResponse)

if (result.ok) {
  // extractJSON() automatically extracts JSON from code blocks
  console.log('User:', result.value.name, result.value.email)
} else {
  console.error('Failed:', result.error.message)
  console.error('Preview:', result.error.context.textPreview)
}
```

### Validating JSON Structure

```typescript
import { validateJSONStructure } from '@jenova-marie/wonder-logger'

const data = { name: 'test', age: 30 }
const requiredFields = ['name', 'age', 'email']

const result = validateJSONStructure(data, requiredFields)

if (result.ok) {
  console.log('Valid:', result.value)
} else {
  console.error('Missing fields:', result.error.context.missingFields)
  // Output: Missing fields: ['email']
}
```

---

## Error Types

### ConfigError

```typescript
type ConfigError = DomainError & {
  kind:
    | 'FileNotFound'        // Config file doesn't exist
    | 'FileReadError'       // Can't read config file
    | 'InvalidYAML'         // YAML syntax error
    | 'SchemaValidation'    // Zod validation failed
    | 'MissingEnvVar'       // Required env var not set
    | 'InvalidEnvVarSyntax' // Bad ${VAR} syntax
}
```

### JSONError

```typescript
type JSONError = DomainError & {
  kind:
    | 'JSONParseError'      // JSON.parse() failed
    | 'JSONExtractionError' // Extraction + parse failed
    | 'JSONStructureError'  // Missing required fields
}
```

### DomainError Structure

All errors extend `DomainError`:

```typescript
interface DomainError {
  kind: string           // Error type discriminator
  message: string        // Human-readable message
  context: object        // Structured error context
  cause?: unknown        // Original error (if wrapped)
  stack?: string         // Stack trace (dev only)
  timestamp: number      // Error creation time
}
```

---

## Pattern Matching

### Switch on Error Kind

```typescript
const result = loadConfig()

if (!result.ok) {
  switch (result.error.kind) {
    case 'FileNotFound':
      console.error('Config file not found:', result.error.context.path)
      console.log('Creating default config...')
      break

    case 'InvalidYAML':
      console.error('YAML syntax error:', result.error.message)
      console.log('Line:', result.error.context.line)
      console.log('Column:', result.error.context.column)
      break

    case 'SchemaValidation':
      console.error('Config validation failed:')
      result.error.context.issues.forEach(issue => {
        console.error(`  ${issue.path.join('.')}: ${issue.message}`)
      })
      break

    case 'MissingEnvVar':
      console.error('Required env var not set:', result.error.context.varName)
      console.log('Expression:', result.error.context.expression)
      break

    default:
      console.error('Unknown error:', result.error)
  }
}
```

### Error Recovery

```typescript
function loadConfigWithFallback(): WonderLoggerConfig {
  const result = loadConfig()

  if (result.ok) {
    return result.value
  }

  // Try fallback config
  if (result.error.kind === 'FileNotFound') {
    console.warn('Using default config')
    return getDefaultConfig()
  }

  // Give up
  throw new Error(`Config error: ${result.error.message}`)
}
```

---

## Observability Integration

### Logging Errors

```typescript
import { toLogContext } from '@jenova-marie/wonder-logger'
import pino from 'pino'

const logger = pino()
const result = loadConfig()

if (!result.ok) {
  // Convert error to Pino log context
  logger.error(toLogContext(result.error), 'Failed to load config')
  // Output:
  // {
  //   "level": 50,
  //   "error_kind": "FileNotFound",
  //   "error_message": "File not found: wonder-logger.yaml",
  //   "error_context": { "path": "wonder-logger.yaml" },
  //   "error_timestamp": 1234567890,
  //   "msg": "Failed to load config"
  // }
}
```

### Tracing Errors

```typescript
import { toSpanAttributes } from '@jenova-marie/wonder-logger'
import { trace } from '@opentelemetry/api'

const result = loadConfig()

if (!result.ok) {
  const span = trace.getActiveSpan()
  span?.setAttributes(toSpanAttributes(result.error))
  span?.setStatus({ code: SpanStatusCode.ERROR, message: result.error.message })
}
```

### Metrics from Errors

```typescript
import { toMetricLabels } from '@jenova-marie/wonder-logger'
import { metrics } from '@opentelemetry/api'

const errorCounter = metrics.getMeter('app').createCounter('config_errors_total')
const result = loadConfig()

if (!result.ok) {
  errorCounter.add(1, toMetricLabels(result.error))
  // Labels: { error_kind: "FileNotFound", error_message: "..." }
}
```

### Sentry Integration

```typescript
import { toSentryError } from '@jenova-marie/wonder-logger'
import * as Sentry from '@sentry/node'

const result = loadConfig()

if (!result.ok) {
  // Convert DomainError to Error instance for Sentry
  Sentry.captureException(toSentryError(result.error))
}
```

---

## Best Practices

### 1. Always Check Results

```typescript
// ❌ BAD - Assumes success
const config = loadConfig().value  // Crashes if error!

// ✅ GOOD - Check first
const result = loadConfig()
if (!result.ok) {
  console.error('Config failed:', result.error)
  process.exit(1)
}
const config = result.value
```

### 2. Use Type Narrowing

```typescript
// ❌ BAD - Manual checks
const result = loadConfig()
if (result.ok === true) {
  const config = result.value as WonderLoggerConfig
}

// ✅ GOOD - Let TypeScript narrow
const result = loadConfig()
if (result.ok) {
  const config = result.value  // Type is WonderLoggerConfig
}
```

### 3. Pattern Match on Error Kinds

```typescript
// ❌ BAD - Generic error handling
if (!result.ok) {
  console.error('Error:', result.error.message)
}

// ✅ GOOD - Specific handling
if (!result.ok) {
  switch (result.error.kind) {
    case 'FileNotFound':
      // Handle missing file
      break
    case 'InvalidYAML':
      // Handle syntax error
      break
    default:
      // Handle unexpected errors
  }
}
```

### 4. Log Error Context

```typescript
// ❌ BAD - Lost context
console.error('Config failed:', result.error.message)

// ✅ GOOD - Include context
logger.error({
  error: toLogContext(result.error),
  environment: process.env.NODE_ENV
}, 'Failed to load config')
```

### 5. Propagate Results

```typescript
// ❌ BAD - Convert to exceptions
function init(): App {
  const result = loadConfig()
  if (!result.ok) throw new Error(result.error.message)
  return new App(result.value)
}

// ✅ GOOD - Return Result
function init(): Result<App, ConfigError> {
  const result = loadConfig()
  if (!result.ok) return result  // Propagate error
  return ok(new App(result.value))
}
```

---

## Further Reading

- **[ts-rust-result Documentation](https://github.com/jenova-marie/ts-rust-result)** - Complete guide to Result types
- **[content/PATTERNS.md](./PATTERNS.md)** - Common usage patterns
- **[src/utils/config/README.md](../src/utils/config/README.md)** - Config system details

---

**Version**: 2.0.0
**Last Updated**: October 2025

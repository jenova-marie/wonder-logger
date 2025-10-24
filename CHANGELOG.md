# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.0.8] - 2025-10-24

### Documentation
- **CRITICAL**: Added comprehensive CLI application guidance for sonic-boom race conditions
  - Documented `sync: true` requirement for CLI tools, Lambda functions, and Kubernetes jobs
  - Added "Transport Configuration by Use Case" decision matrix to CONFIGURATION.md
  - Added performance impact benchmarks (4-5ms penalty for 100% reliability)
  - Split Quick Start into "Web Servers" and "CLI Tools" sections in README.md
  - Added detailed JSDoc warnings on `FileTransportOptions.sync` parameter

### Removed
- Removed flaky integration tests for quick-exit scenarios
  - Tests were environment-dependent (SIGTERM interference from test suite)
  - Functionality is thoroughly documented in CONFIGURATION.md and README.md
  - CLI quick-exit behavior validated manually

### Context
- Users reported "sonic boom is not ready yet" crashes in CLI applications
- Root cause: async file transports initialize in ~100-200ms, CLI apps exit in <100ms
- Solution: `sync: true` eliminates initialization race with negligible performance cost
- This is a **documentation-only release** - no code changes, educates users on existing feature

### Recommendations
- **CLI tools**: Use `sync: true` for file transports (required)
- **Web servers**: Use `sync: false` for file transports (better throughput)
- **Lambda functions**: Use `sync: true` (same quick-exit pattern as CLI)
- **Kubernetes jobs**: Use `sync: true` (SIGTERM may not allow async flush)

## [2.0.7] - 2025-10-24

### Fixed
- **CRITICAL**: Fixed ESM compatibility issue in traceContext plugin
  - Replaced `require('@opentelemetry/api')` with proper ESM import
  - Plugin now works correctly in ESM module contexts
  - Fixes runtime error: "Cannot enable trace context: @opentelemetry/api is not installed"
  - Error was caused by require() not working in ESM, not missing dependency
- Changed from lazy-loading pattern to direct import for better ESM compatibility
- All ESM projects can now use `plugins.traceContext: true` without errors

### Changed
- traceContext plugin now uses direct import instead of dynamic require()
- Removed loadOtelApi() lazy-loading function (no longer needed)
- Simplified plugin code and improved reliability

### Technical Details
- Source: `src/utils/logger/plugins/traceContext.ts`
- Old: `const otel = require('@opentelemetry/api')` (line 45)
- New: `import { trace } from '@opentelemetry/api'` (line 20)
- Impact: All ESM projects using wonder-logger with traceContext enabled

## [2.0.4] - 2025-10-24

### Fixed
- **CRITICAL**: Moved `pino-pretty` from devDependencies to dependencies
  - Console transport with `pretty: true` now works without manual installation
  - Fixes runtime error: "unable to determine transport target for 'pino-pretty'"
  - All documented configuration examples now work out-of-the-box
- Verified `@opentelemetry/api` is correctly listed as a dependency (already present)

### Documentation
- Added comprehensive configuration schema documentation to `content/CONFIGURATION.md`
  - ⚠️ Type safety warnings for environment variable interpolation
  - Detailed validation error reference with troubleshooting guide
  - Correct/incorrect examples showing proper boolean/number literal usage
  - Debug script template for extracting detailed validation errors
- Updated README.md with prominent links to configuration documentation
- Updated all Quick Start examples with inline warnings about common mistakes

### Notes
- This patch restores the "batteries included" promise of wonder-logger
- Users can now use all features without manual dependency installation
- Peer dependency warnings for pino-opentelemetry-transport (expects Pino ^8 || ^9, we use ^10) are cosmetic and do not affect functionality

## [2.0.0] - 2025-10-23

### Added
- **ts-rust-result Integration** - Type-safe Result types for error handling
  - Domain-specific Result wrappers for config and JSON modules
  - `ConfigResult<T>` for config loading operations (returns Result instead of throwing)
  - `JSONResult<T>` for JSON parsing operations (returns Result instead of throwing)
  - Error factories with builder pattern (`error(kind).withMessage().withContext().build()`)
  - Comprehensive error types: `ConfigError`, `JSONError`
  - Observability helpers exported: `toLogContext()`, `toSpanAttributes()`, `toMetricLabels()`
  - Zero type assertions using `createDomainResult<E>()` pattern
- Public API exports for ts-rust-result types (`ok`, `err`, `Result`, `DomainError`)
- Error factory functions exported (`fileNotFound`, `fileReadError`, `invalidJSON`, `fromError`, `tryResultSafe`, `toSentryError`)

### Changed
- **BREAKING**: `parseJSONResponse<T>()` now returns `JSONResult<T>` instead of throwing errors
- **BREAKING**: `validateJSONStructure<T>()` now returns `JSONResult<T>` instead of returning boolean
- **BREAKING**: Config loading functions now return `ConfigResult<T>` instead of throwing errors:
  - `loadConfig()` → `ConfigResult<WonderLoggerConfig>`
  - `loadConfigFromFile()` → `ConfigResult<WonderLoggerConfig>`
  - `findConfigFile()` → `ConfigResult<string>`
- Updated all 50 JSON parser tests to handle Result types
- Updated all 12 config integration tests to handle Result types

### Fixed
- Improved error context for JSON parsing failures with structured error information
- Better error messages for config loading failures with file paths and validation details

## [1.0.0] - 2025-10-13

### Added
- Initial release of Wonder Logger
- OpenTelemetry SDK factory with modular exporter support
  - Console exporters for traces and metrics
  - OTLP HTTP exporters for traces and metrics
  - Jaeger exporter for traces
  - Prometheus exporter for metrics
- Pino-based structured logging
  - Console transport with optional pretty printing
  - File transport with async I/O via worker threads
  - OpenTelemetry OTLP transport for log aggregation
- OpenTelemetry trace context plugin for log correlation
- Morgan HTTP request logging adapter
- Automatic instrumentation for HTTP, Express, and database libraries
- Custom HTTP request/response attribute hooks
- Graceful shutdown handlers with signal handling
- Manual instrumentation helper (`withSpan`)
- Comprehensive test suite
  - 237 unit tests
  - 63 integration tests
  - 19 E2E tests
- TypeScript definitions with strict mode
- ESM-first module design
- GitHub Actions CI/CD workflows
- Full documentation for OTEL and logger modules

### Changed
- N/A

### Deprecated
- N/A

### Removed
- N/A

### Fixed
- N/A

### Security
- N/A

[Unreleased]: https://github.com/jenova-marie/wonder-logger/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/jenova-marie/wonder-logger/releases/tag/v1.0.0

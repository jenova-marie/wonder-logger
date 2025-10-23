# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

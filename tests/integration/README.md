# Integration Tests

Integration tests for the logging SDK that verify real-world behavior without mocks.

## Running Tests

```bash
# Run integration tests only
pnpm test:integration

# Run with coverage
pnpm test:integration:coverage

# Run all tests (unit + integration)
pnpm test
```

## Test Structure

```
tests/integration/logger/
├── basic.test.ts           # Core logging functionality
├── multiTransport.test.ts  # Multiple transport scenarios
├── traceContext.test.ts    # Child loggers & OpenTelemetry
├── errorHandling.test.ts   # Error serialization & edge cases
└── fileIO.test.ts          # File writing & persistence
```

## What's Tested

### Basic Functionality (7 tests)
- Logger creation and info messages
- Log level filtering
- Base fields in every log
- Child logger context
- Error serialization
- Sequential logging
- Complex nested objects

### Multiple Transports (6 tests)
- Logs sent to multiple destinations
- Per-transport level filtering
- File + console combinations
- 3+ simultaneous transports
- Consistent timestamps
- Transport-specific formatting

### Trace Context (7 tests)
- Child loggers with additional context
- Nested child loggers
- OpenTelemetry trace context integration
- Preserving context through wrapping
- Independent child loggers
- Field overriding
- Dynamic context during request lifecycle

### Error Handling (14 tests)
- Standard Error objects
- Custom Error types
- Errors with additional properties
- Circular references
- Large objects (1000+ items)
- Special JavaScript types (Date, RegExp, Map, Set)
- Null/undefined values
- Stream write errors
- Sequential error logging
- Async errors in promises
- High-frequency logging (1000 messages)
- Deeply nested objects (50 levels)
- Buffers and binary data
- Mixed error and data context

### File I/O (8 tests)
- File creation and writing
- Multiple files with different levels
- Persistent logs across operations (50 entries)
- JSON parsing of written logs
- High-volume writes (1000 entries)
- Error handling in file paths
- Nested directory creation
- Consistent timestamps

## Test Coverage

Integration tests achieve:
- **Logger core**: 84.84%
- **Console transport**: 53.57%
- **Trace context**: 53.33%
- **File I/O**: Full coverage (8 tests)

Integration tests focus on real behavior rather than code coverage, testing:
- Multiple transport combinations
- OpenTelemetry integration
- Error handling edge cases
- High-volume scenarios (1000+ logs)
- File system persistence

## Test Results

All integration tests are passing:

```
✓ tests/integration/logger/basic.test.ts (7 tests)
✓ tests/integration/logger/errorHandling.test.ts (14 tests)
✓ tests/integration/logger/traceContext.test.ts (7 tests)
✓ tests/integration/logger/multiTransport.test.ts (6 tests)
✓ tests/integration/logger/fileIO.test.ts (8 tests)
✓ tests/integration/otel-metrics.test.ts (21 tests)

Total: 63 tests passing
```

### File I/O Tests

The file I/O integration tests are fully enabled and validate:
- File creation and writing (JSON output)
- Multiple files with different log levels
- Persistence across multiple operations (50+ entries)
- JSON parsing of written logs
- High-volume writes (1000 entries)
- Error handling in file paths
- Nested directory creation
- Consistent timestamps across async operations

## Configuration

Integration tests use:
- `vitest.config.ts` - Vitest configuration with setup file
- `tests/integration/setup.ts` - Ensures logs directory exists
- `tests/integration/logs/.gitkeep` - Keeps logs directory in git
- `.gitignore` excludes test log files from version control

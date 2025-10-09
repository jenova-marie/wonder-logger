# End-to-End Integration Tests

End-to-end tests that validate the complete observability pipeline from SDK → OTEL Collector → Loki/Tempo.

## Overview

These tests verify the full data flow:

1. **SDK** → Logs/traces are created using our SDK
2. **OTEL Collector** → Receives telemetry data via OTLP protocol
3. **Loki/Tempo** → Stores the data
4. **API Query** → We retrieve and validate the data via Grafana APIs

## Prerequisites

### Infrastructure Requirements

- **Loki** running at `https://loki.rso`
- **Tempo** running at `https://tempo.rso`
- **OTEL Collector** configured with:
  - OTLP receiver on port 4318 (HTTP)
  - Exporters for Loki (logs) and Tempo (traces)
- Network connectivity from test environment to `*.rso` domains

### Environment Variables

```bash
# Optional: Override OTEL collector endpoint
export OTEL_EXPORTER_OTLP_ENDPOINT="http://localhost:4318/v1/logs"
```

## Running Tests

```bash
# Run all E2E tests
pnpm test:e2e

# Run with coverage
pnpm test:e2e:coverage

# Run specific test file
pnpm test tests/integration/e2e/loki.test.ts
pnpm test tests/integration/e2e/tempo.test.ts
```

## Test Structure

```
tests/integration/e2e/
├── loki.test.ts       # Loki log ingestion tests
├── tempo.test.ts      # Tempo trace ingestion tests
├── helpers.ts         # Shared utilities
└── README.md          # This file
```

## Tests

### Loki Tests (`loki.test.ts`)

Tests log ingestion and querying via Loki API.

**Test Cases:**
1. **Send logs to OTEL collector and appear in Loki**
   - Creates unique test log
   - Waits for ingestion (3 seconds)
   - Queries Loki API using LogQL
   - Validates log appears with correct content

2. **Handle multiple logs in sequence**
   - Sends batch of 5 logs
   - Validates all appear in correct order
   - Checks sequence numbers

3. **Include service metadata in logs**
   - Validates service name in stream labels
   - Checks service metadata in log content

**API Used:**
- `GET /loki/api/v1/query_range`
- Query parameters: `query`, `start`, `end`, `limit`, `direction`
- Timestamps in nanoseconds

**Example Query:**
```logql
{service_name="e2e-loki-test"} |= "test-123abc"
```

### Tempo Tests (`tempo.test.ts`)

Tests trace ingestion and querying via Tempo API.

**Test Cases:**
1. **Send traces to OTEL collector and appear in Tempo**
   - Creates span with unique attributes
   - Waits for ingestion (5 seconds)
   - Queries Tempo by trace ID
   - Validates span and attributes

2. **Record span status and errors**
   - Creates failing span
   - Validates error status code
   - Checks exception recording

3. **Create nested spans**
   - Creates root span with 2 nested children
   - Validates parent-child relationships
   - Checks all share same trace ID

4. **Include service resource attributes**
   - Validates service.name attribute
   - Checks service.version
   - Verifies deployment.environment

**API Used:**
- `GET /api/v2/traces/{traceID}`
- Returns OpenTelemetry JSON format
- Optional time range filtering

## Helper Utilities

### `helpers.ts`

Provides reusable functions for E2E tests:

```typescript
// Query Loki
const logs = await queryLoki(
  'https://loki.rso',
  '{job="app"}',
  startNano,
  endNano
)

// Query Tempo
const trace = await queryTempoTrace(
  'https://tempo.rso',
  traceId
)

// Wait for condition with retries
await waitForCondition(async () => {
  const result = await queryLoki(...)
  return result.data.result.length > 0
}, 10, 1000)

// Generate unique test ID
const testId = generateTestId('e2e')

// Convert timestamps
const nano = toNanoseconds(Date.now())
const epoch = toEpochSeconds(Date.now())

// Parse log lines
const log = parseLogLine(logLine)

// Find spans in traces
const span = findSpanByName(trace, 'my-operation')

// Get resource attributes
const serviceName = getResourceAttribute(trace, 'service.name')
```

## Current Status

✅ **All E2E tests passing** (19 tests across 3 observability backends)

The E2E tests validate the complete production observability pipeline:
- **Loki** (3 tests) - Log aggregation and querying
- **Tempo** (4 tests) - Distributed tracing with tail sampling
- **Prometheus** (6 tests) - Metrics collection (pull + push models)
- **Local OTEL** (6 tests) - Collector health and endpoint validation

### Test Results

```
✓ tests/e2e/loki.test.ts (3 tests)
  ✓ should send logs to OTEL collector and appear in Loki
  ✓ should handle multiple logs in sequence
  ✓ should include service metadata in logs

✓ tests/e2e/tempo.test.ts (4 tests)
  ✓ should send traces to OTEL collector and appear in Tempo
  ✓ should record span status and errors
  ✓ should create nested spans
  ✓ should include service resource attributes

✓ tests/e2e/metrics.test.ts (6 tests)
  ✓ Pull/Scrape Model (3 tests) - Prometheus exporter
  ✓ Push/Remote Write Model (3 tests) - OTLP → Prometheus

✓ tests/e2e/local-otel.test.ts (6 tests)
  ✓ Collector health and zpages
  ✓ Logs and traces transport
  ✓ OTLP endpoint verification
```

### Running E2E Tests

```bash
# Set TLS env var for self-signed certs
export NODE_TLS_REJECT_UNAUTHORIZED=0

# Run all E2E tests
pnpm test:e2e

# Run specific test suite
pnpm test tests/e2e/loki.test.ts
pnpm test tests/e2e/tempo.test.ts
pnpm test tests/e2e/metrics.test.ts

# With verbose output
NODE_TLS_REJECT_UNAUTHORIZED=0 pnpm test tests/e2e/tempo.test.ts --reporter=verbose
```

## Timing Considerations

### Ingestion Delays

Telemetry data flows through multiple systems with measured delays:

1. **SDK → OTEL Collector:** 100ms (batch flush interval)
2. **OTEL Collector → Backend:**
   - **Loki:** 10s batch window (Loki ingestion delay)
   - **Tempo:** 10s tail sampling decision + ingestion
   - **Prometheus:** 15s remote write interval
3. **Backend Indexing:** 2-5 seconds

**Expected wait times:**
- **Loki logs:** 12 seconds (batch + indexing)
- **Tempo traces:** 20 seconds (tail sampling + ingestion)
- **Prometheus metrics:** 30 seconds (remote write + scrape)

### Test Timeouts

- **Loki tests:** 30 seconds
- **Tempo tests:** 40 seconds
- **Metrics tests:** 60 seconds (pull) / 120 seconds (push)
- **Includes:** SDK flush + pipeline delays + query time

### OTEL Collector Configuration

The production OTEL collector uses:
- **Batch processor:** 100ms timeout, 1024 batch size
- **Tail sampling:** 10s decision wait, 100% sample rate for test traces
- **Resource processor:** Adds service metadata with `action: insert` (preserves SDK values)
- **Transform processors:** Promotes resource attributes to labels for indexing

## API Reference

### Loki API

**Endpoint:** `GET /loki/api/v1/query_range`

**Parameters:**
- `query` (string): LogQL query
- `start` (string): Start timestamp in nanoseconds
- `end` (string): End timestamp in nanoseconds
- `limit` (number): Max results (default: 100)
- `direction` (string): `forward` or `backward`

**Response:**
```json
{
  "status": "success",
  "data": {
    "resultType": "streams",
    "result": [{
      "stream": { "label": "value" },
      "values": [
        ["<timestamp_nano>", "<log_line>"]
      ]
    }]
  }
}
```

### Tempo API

**Endpoint:** `GET /api/v2/traces/{traceID}`

**Response:**
```json
{
  "batches": [{
    "resource": {
      "attributes": [
        { "key": "service.name", "value": { "stringValue": "app" }}
      ]
    },
    "scopeSpans": [{
      "spans": [{
        "traceId": "<trace_id>",
        "spanId": "<span_id>",
        "name": "operation-name",
        "attributes": [...]
      }]
    }]
  }]
}
```

## Troubleshooting

### Tests Timeout

**Symptoms:** Tests fail after 10-15 seconds

**Causes:**
- OTEL Collector not running
- Loki/Tempo not accessible
- Network connectivity issues
- Ingestion delay longer than expected

**Solutions:**
1. Check infrastructure health
2. Verify network connectivity
3. Increase test timeout values
4. Check OTEL Collector logs

### Data Not Found in Loki/Tempo

**Symptoms:** Queries return empty results

**Causes:**
- OTEL Collector not configured correctly
- Exporter not enabled
- Wrong endpoint configuration
- Timestamps outside query range

**Solutions:**
1. Verify OTEL Collector config
2. Check collector logs for export errors
3. Widen time range in queries
4. Validate LogQL/TraceQL syntax

### Authentication Errors

**Symptoms:** 401/403 responses from Loki/Tempo

**Solutions:**
1. Check if auth is required
2. Add authentication headers if needed
3. Verify API tokens/credentials

## Best Practices

1. **Use unique test IDs** - Avoid collisions with concurrent tests
2. **Wait for ingestion** - Allow 3-5 seconds for data to appear
3. **Narrow time ranges** - Query only recent data (last 10 seconds)
4. **Clean up test data** - Use unique IDs to avoid polluting production data
5. **Retry logic** - Use `waitForCondition` for flaky scenarios
6. **Specific queries** - Use precise LogQL/TraceQL to reduce false positives

## Future Enhancements

- [ ] Add metrics validation (Prometheus/Mimir)
- [ ] Test correlation between logs and traces
- [ ] Validate sampling strategies
- [ ] Test high-volume scenarios
- [ ] Add performance benchmarks
- [ ] Test failover scenarios
- [ ] Validate data retention

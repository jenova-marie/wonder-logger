# Metrics Guide

Metrics collection with OpenTelemetry - export metrics to Prometheus, OTLP endpoints, and more.

## Quick Reference

For comprehensive metrics documentation, see **[src/utils/otel/README.md](../src/utils/otel/README.md)**

## Quick Start

```typescript
import { createTelemetry } from '@jenova-marie/wonder-logger'
import { metrics } from '@opentelemetry/api'

const sdk = createTelemetry({
  serviceName: 'my-api',
  metrics: {
    enabled: true,
    exporters: [
      { type: 'prometheus', port: 9464 }
    ]
  }
})

// Create custom metrics
const meter = metrics.getMeter('my-api')
const requestCounter = meter.createCounter('http_requests_total')

requestCounter.add(1, { method: 'GET', path: '/users' })
```

## Key Features

- **Multiple Exporters** - Prometheus (pull), OTLP (push)
- **Custom Metrics** - Counters, histograms, gauges
- **Auto-Collection** - Process metrics, runtime metrics
- **Labels** - Multi-dimensional metrics
- **Push & Pull** - Support for both models

## Metric Exporters

### Prometheus Exporter (Pull/Scrape)

```typescript
const sdk = createTelemetry({
  serviceName: 'my-api',
  metrics: {
    enabled: true,
    exporters: [
      {
        type: 'prometheus',
        port: 9464  // Metrics exposed at http://localhost:9464/metrics
      }
    ]
  }
})
```

Scrape configuration:

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'my-api'
    static_configs:
      - targets: ['localhost:9464']
```

### OTLP Exporter (Push/Remote Write)

```typescript
const sdk = createTelemetry({
  serviceName: 'my-api',
  metrics: {
    enabled: true,
    exporters: [
      {
        type: 'otlp',
        endpoint: 'http://localhost:4318/v1/metrics',
        exportIntervalMillis: 60000  // Export every 60s
      }
    ]
  }
})
```

## Creating Custom Metrics

### Counter

```typescript
import { metrics } from '@opentelemetry/api'

const meter = metrics.getMeter('my-api')
const requestCounter = meter.createCounter('http_requests_total', {
  description: 'Total number of HTTP requests'
})

// Increment
requestCounter.add(1, {
  method: 'GET',
  path: '/users',
  status: '200'
})
```

### Histogram

```typescript
const meter = metrics.getMeter('my-api')
const requestDuration = meter.createHistogram('http_request_duration_ms', {
  description: 'HTTP request duration in milliseconds'
})

const start = Date.now()
// ... handle request ...
const duration = Date.now() - start

requestDuration.record(duration, {
  method: 'GET',
  path: '/users'
})
```

### Gauge (Observable)

```typescript
const meter = metrics.getMeter('my-api')
const activeConnections = meter.createObservableGauge('active_connections', {
  description: 'Number of active connections'
})

activeConnections.addCallback((observableResult) => {
  const count = getActiveConnectionCount()
  observableResult.observe(count)
})
```

## Metric Labels

Add dimensions to metrics with labels:

```typescript
requestCounter.add(1, {
  method: 'GET',
  path: '/users',
  status: '200',
  environment: 'production',
  region: 'us-east-1'
})
```

Query in Prometheus:

```promql
# Total requests
http_requests_total

# Filtered by labels
http_requests_total{method="GET", status="200"}

# Rate of errors
rate(http_requests_total{status=~"5.."}[5m])
```

## Multiple Exporters

Export to both Prometheus and OTLP:

```typescript
const sdk = createTelemetry({
  serviceName: 'my-api',
  metrics: {
    enabled: true,
    exporters: [
      {
        type: 'prometheus',
        port: 9464  // Pull model for local scraping
      },
      {
        type: 'otlp',
        endpoint: 'https://otlp.example.com/v1/metrics',  // Push to remote
        exportIntervalMillis: 60000
      }
    ]
  }
})
```

## Force Flush (Testing)

```typescript
// Force immediate export (useful in tests)
await sdk.forceFlush()
```

## Complete Documentation

See **[src/utils/otel/README.md](../src/utils/otel/README.md)** for:
- Exporter configuration
- Metric types (counter, histogram, gauge)
- Aggregation strategies
- Best practices

---

**Version**: 2.0.0
**Last Updated**: October 2025

/**
 * End-to-end integration tests for Prometheus metrics
 *
 * These tests validate both Prometheus integration patterns:
 * 1. Pull model (scraping): SDK exposes /metrics endpoint
 * 2. Push model (remote write): SDK → OTEL collector → Prometheus
 *
 * Prerequisites:
 * - Prometheus remote write: https://prometheus.rso:9090/api/v1/write
 * - OTEL collector: localhost:4318
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTelemetry } from "../../src/utils/otel";
import { metrics as metricsApi } from "@opentelemetry/api";

const PROMETHEUS_URL = "https://prometheus.rso:9090";
const PROMETHEUS_METRICS_PORT = 9466; // Test metrics endpoint (scrape model)
const TEST_TIMEOUT = 60000; // 60 seconds for ingestion + indexing
const METRICS_EXPORT_WAIT = 1000; // Wait 1s for metrics to be collected (scrape model)
const PROMETHEUS_SCRAPE_WAIT = 30000; // Wait 30s for remote write ingestion (SDK export + OTEL batch + Prometheus ingest)

interface PrometheusQueryResponse {
  status: string;
  data: {
    resultType: string;
    result: Array<{
      metric: Record<string, string>;
      value: [number, string];
    }>;
  };
}

/**
 * Query Prometheus API for a metric
 */
async function queryPrometheus(
  query: string,
): Promise<PrometheusQueryResponse> {
  const params = new URLSearchParams({
    query,
    time: Math.floor(Date.now() / 1000).toString(),
  });

  const url = `${PROMETHEUS_URL}/api/v1/query?${params.toString()}`;
  console.log(`   Prometheus URL: ${url}`);

  const response = await fetch(url, {
    // TLS handled by NODE_TLS_REJECT_UNAUTHORIZED env var
  });

  if (!response.ok) {
    throw new Error(
      `Prometheus query failed: ${response.status} ${response.statusText}`,
    );
  }

  const result = await response.json();
  console.log(`   Prometheus response:`, JSON.stringify(result, null, 2));
  return result;
}

/**
 * Query Prometheus /metrics endpoint (for scrape model tests)
 */
async function queryPrometheusMetrics(): Promise<string> {
  const url = `http://localhost:${PROMETHEUS_METRICS_PORT}/metrics`;
  console.log(`   Metrics URL: ${url}`);

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Metrics endpoint query failed: ${response.status} ${response.statusText}`,
    );
  }

  return await response.text();
}

/**
 * Parse Prometheus text format and find metric
 */
function findMetricInPrometheusText(
  text: string,
  metricName: string,
): string[] {
  const lines = text.split("\n");
  return lines.filter(
    (line) => line.startsWith(metricName) && !line.startsWith("#"),
  );
}

describe("E2E Integration - Prometheus (Pull/Scrape Model)", () => {
  let sdk: any;

  beforeAll(() => {
    // Initialize OpenTelemetry SDK with Prometheus exporter (pull model)
    sdk = createTelemetry({
      serviceName: "e2e-prometheus-scrape",
      serviceVersion: "1.0.0",
      environment: "test",
      tracing: {
        enabled: false, // Disable tracing for metrics-only tests
      },
      metrics: {
        enabled: true,
        exporters: ["prometheus"], // Expose /metrics endpoint for scraping
        port: PROMETHEUS_METRICS_PORT,
      },
    });
  });

  afterAll(async () => {
    if (sdk) {
      await sdk.shutdown();
      // CRITICAL: Unregister the global MeterProvider to prevent interference with subsequent test suites
      metricsApi.disable();
    }
  });

  it(
    "should expose counter metrics via Prometheus /metrics endpoint",
    async () => {
      const meter = metricsApi.getMeter("e2e-prometheus-scrape");
      const testId = `test-${Date.now()}`;

      // Create a counter with unique test ID
      const counter = meter.createCounter("e2e_test_requests_total", {
        description: "E2E test counter for Prometheus validation",
      });

      console.log("✅ Created counter:", "e2e_test_requests_total");

      // Record metric value with unique test ID
      counter.add(1, {
        test_id: testId,
        environment: "e2e",
        test_type: "prometheus",
      });

      console.log("✅ Recorded metric with test_id:", testId);

      // Wait for Prometheus exporter to collect metrics
      console.log(
        `⏳ Waiting ${METRICS_EXPORT_WAIT / 1000}s for metrics collection...`,
      );
      await new Promise((resolve) => setTimeout(resolve, METRICS_EXPORT_WAIT));

      // Query /metrics endpoint
      console.log("🔍 Querying /metrics endpoint...");
      const metricsText = await queryPrometheusMetrics();

      // Find our metric in the Prometheus text format
      const metricLines = findMetricInPrometheusText(
        metricsText,
        "e2e_test_requests_total",
      );
      console.log("   Found metric lines:", metricLines.length);

      expect(metricLines.length).toBeGreaterThan(0);

      // Verify metric has our labels
      const matchingLine = metricLines.find((line) => line.includes(testId));
      expect(matchingLine).toBeDefined();
      expect(matchingLine).toContain('test_id="' + testId + '"');
      expect(matchingLine).toContain('environment="e2e"');
    },
    TEST_TIMEOUT,
  );

  it(
    "should expose histogram metrics with buckets, sum, and count",
    async () => {
      const meter = metricsApi.getMeter("e2e-prometheus-scrape");
      const testId = `histogram-${Date.now()}`;

      const histogram = meter.createHistogram("e2e_test_duration_ms", {
        description: "E2E test histogram for duration tracking",
      });

      console.log("✅ Created histogram:", "e2e_test_duration_ms");

      // Record multiple duration values
      const durations = [100, 250, 500];
      durations.forEach((duration) => {
        histogram.record(duration, {
          test_id: testId,
          operation: "e2e_test",
        });
      });

      console.log("✅ Recorded histogram values:", durations);

      console.log(
        `⏳ Waiting ${METRICS_EXPORT_WAIT / 1000}s for metrics collection...`,
      );
      await new Promise((resolve) => setTimeout(resolve, METRICS_EXPORT_WAIT));

      // Query /metrics endpoint
      console.log("🔍 Querying /metrics endpoint for histogram...");
      const metricsText = await queryPrometheusMetrics();

      // Histograms create _bucket, _sum, and _count metrics
      const bucketLines = findMetricInPrometheusText(
        metricsText,
        "e2e_test_duration_ms_bucket",
      );
      const sumLines = findMetricInPrometheusText(
        metricsText,
        "e2e_test_duration_ms_sum",
      );
      const countLines = findMetricInPrometheusText(
        metricsText,
        "e2e_test_duration_ms_count",
      );

      console.log("   Found buckets:", bucketLines.length);
      console.log("   Found sum:", sumLines.length);
      console.log("   Found count:", countLines.length);

      expect(bucketLines.length).toBeGreaterThan(0);
      expect(sumLines.length).toBeGreaterThan(0);
      expect(countLines.length).toBeGreaterThan(0);

      // Verify test_id label is present
      const matchingCount = countLines.find((line) => line.includes(testId));
      expect(matchingCount).toBeDefined();
      expect(matchingCount).toContain('test_id="' + testId + '"');

      // Verify count value is 3
      const countMatch = matchingCount!.match(/}\s+([\d.]+)/);
      expect(countMatch).toBeDefined();
      expect(parseInt(countMatch![1])).toBe(3);
    },
    TEST_TIMEOUT,
  );

  it(
    "should include custom metric attributes",
    async () => {
      const meter = metricsApi.getMeter("e2e-prometheus-scrape");
      const testId = `metadata-${Date.now()}`;

      const counter = meter.createCounter("e2e_test_metadata_total");

      counter.add(1, {
        test_id: testId,
        custom_label: "metadata_test",
        environment: "e2e",
      });

      console.log("✅ Recorded metric with custom attributes");

      console.log(
        `⏳ Waiting ${METRICS_EXPORT_WAIT / 1000}s for metrics collection...`,
      );
      await new Promise((resolve) => setTimeout(resolve, METRICS_EXPORT_WAIT));

      console.log(
        "🔍 Querying /metrics endpoint for metric with custom attributes...",
      );
      const metricsText = await queryPrometheusMetrics();

      const metricLines = findMetricInPrometheusText(
        metricsText,
        "e2e_test_metadata_total",
      );

      expect(metricLines.length).toBeGreaterThan(0);

      const matchingLine = metricLines.find((line) => line.includes(testId));
      expect(matchingLine).toBeDefined();

      // Check custom metric attributes are present
      expect(matchingLine).toContain('test_id="' + testId + '"');
      expect(matchingLine).toContain('custom_label="metadata_test"');
      expect(matchingLine).toContain('environment="e2e"');
    },
    TEST_TIMEOUT,
  );
});

describe("E2E Integration - Prometheus (Push/Remote Write Model)", () => {
  /**
   * Tests for Prometheus remote write integration
   *
   * Pipeline: SDK → OTEL collector → Prometheus remote write API
   * Endpoint: https://prometheus.rso:9090/api/v1/write
   *
   * Note: Requires Prometheus to be started with --web.enable-remote-write-receiver flag
   */
  let sdk: any;

  beforeAll(() => {
    // Initialize OpenTelemetry SDK with OTLP exporter → remote write
    sdk = createTelemetry({
      serviceName: "e2e-prometheus-push",
      serviceVersion: "1.0.0",
      environment: "test",
      tracing: {
        enabled: false, // Disable tracing for metrics-only tests
      },
      metrics: {
        enabled: true,
        exporters: ["otlp"], // Export to OTEL collector → Prometheus remote write
        exportIntervalMillis: 100, // Fast export for testing
      },
    });
  });

  afterAll(async () => {
    if (sdk) {
      await sdk.shutdown();
      // Clean up global MeterProvider
      metricsApi.disable();
    }
  });

  it(
    "should send counter metrics to Prometheus via remote write",
    async () => {
      const meter = metricsApi.getMeter("e2e-prometheus-push");
      const testId = `push-${Date.now()}`;

      const counter = meter.createCounter("e2e_push_requests_total", {
        description: "E2E test counter for remote write validation",
      });

      console.log("✅ Created counter:", "e2e_push_requests_total");

      counter.add(1, {
        test_id: testId,
        environment: "e2e",
        test_type: "remote_write",
      });

      console.log("✅ Recorded metric with test_id:", testId);

      // Force flush metrics immediately (for testing purposes)
      console.log("🔄 Forcing metric flush...");
      await sdk.forceFlush();

      // Wait for OTEL collector → Prometheus remote write pipeline
      console.log(
        `⏳ Waiting ${PROMETHEUS_SCRAPE_WAIT / 1000}s for OTEL collector → Prometheus remote write pipeline...`,
      );
      await new Promise((resolve) =>
        setTimeout(resolve, PROMETHEUS_SCRAPE_WAIT),
      );

      // Query Prometheus API
      console.log("🔍 Querying Prometheus for metric...");
      const promQuery = `e2e_push_requests_total{test_id="${testId}"}`;
      const result = await queryPrometheus(promQuery);

      expect(result.status).toBe("success");
      expect(result.data.resultType).toBe("vector");
      expect(result.data.result.length).toBeGreaterThan(0);

      const metric = result.data.result[0];
      expect(metric.metric.test_id).toBe(testId);
      expect(metric.value[1]).toBe("1"); // Counter value should be 1
    },
    TEST_TIMEOUT,
  );

  it(
    "should send histogram metrics via remote write",
    async () => {
      const meter = metricsApi.getMeter("e2e-prometheus-push");
      const testId = `push-histogram-${Date.now()}`;

      const histogram = meter.createHistogram("e2e_push_duration_ms", {
        description: "E2E test histogram for remote write",
      });

      console.log("✅ Created histogram:", "e2e_push_duration_ms");

      // Record multiple duration values
      const durations = [100, 250, 500];
      durations.forEach((duration) => {
        histogram.record(duration, {
          test_id: testId,
          operation: "e2e_test",
        });
      });

      console.log("✅ Recorded histogram values:", durations);

      // Force flush metrics immediately (for testing purposes)
      console.log("🔄 Forcing metric flush...");
      await sdk.forceFlush();

      // Wait for OTEL collector → Prometheus remote write pipeline
      console.log(
        `⏳ Waiting ${PROMETHEUS_SCRAPE_WAIT / 1000}s for pipeline...`,
      );
      await new Promise((resolve) =>
        setTimeout(resolve, PROMETHEUS_SCRAPE_WAIT),
      );

      // Query for histogram count
      console.log("🔍 Querying Prometheus for histogram...");
      const promQuery = `e2e_push_duration_ms_count{test_id="${testId}"}`;
      const result = await queryPrometheus(promQuery);

      expect(result.status).toBe("success");
      expect(result.data.result.length).toBeGreaterThan(0);

      const metric = result.data.result[0];
      expect(metric.metric.test_id).toBe(testId);
      expect(parseInt(metric.value[1])).toBe(durations.length);
    },
    TEST_TIMEOUT,
  );

  it(
    "should include metric attributes in remote write",
    async () => {
      const meter = metricsApi.getMeter("e2e-prometheus-push");
      const testId = `push-metadata-${Date.now()}`;

      const counter = meter.createCounter("e2e_push_metadata_total");

      counter.add(1, {
        test_id: testId,
        custom_label: "remote_write_test",
        environment: "e2e",
      });

      console.log("✅ Recorded metric with custom attributes");

      // Force flush metrics immediately (for testing purposes)
      console.log("🔄 Forcing metric flush...");
      await sdk.forceFlush();

      // Wait for OTEL collector → Prometheus remote write pipeline
      console.log(
        `⏳ Waiting ${PROMETHEUS_SCRAPE_WAIT / 1000}s for pipeline...`,
      );
      await new Promise((resolve) =>
        setTimeout(resolve, PROMETHEUS_SCRAPE_WAIT),
      );

      console.log("🔍 Querying Prometheus for metric with attributes...");
      const promQuery = `e2e_push_metadata_total{test_id="${testId}"}`;
      const result = await queryPrometheus(promQuery);

      expect(result.status).toBe("success");
      expect(result.data.result.length).toBeGreaterThan(0);

      const metric = result.data.result[0];
      expect(metric.metric.test_id).toBe(testId);
      expect(metric.metric.custom_label).toBe("remote_write_test");
      // Note: Collector's resource processor uses action: upsert for deployment.environment
      // It overrides SDK value with ${env:ENV} which is "Dev"
      expect(metric.metric.environment).toBe("Dev");
    },
    TEST_TIMEOUT,
  );
});

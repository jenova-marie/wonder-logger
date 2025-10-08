/**
 * Helper utilities for E2E integration tests
 *
 * Provides common functions for querying Loki and Tempo APIs
 */

export interface LokiQueryResponse {
  status: string
  data: {
    resultType: string
    result: Array<{
      stream: Record<string, string>
      values: Array<[string, string]> // [timestamp, log line]
    }>
    stats?: Record<string, any>
  }
}

export interface TempoTraceResponse {
  batches?: Array<{
    resource?: {
      attributes?: Array<{
        key: string
        value: { stringValue?: string; intValue?: string }
      }>
    }
    scopeSpans?: Array<{
      scope?: {
        name: string
        version?: string
      }
      spans?: Array<{
        traceId: string
        spanId: string
        name: string
        kind?: number
        startTimeUnixNano?: string
        endTimeUnixNano?: string
        attributes?: Array<{
          key: string
          value: { stringValue?: string; intValue?: string; boolValue?: boolean }
        }>
        status?: {
          code?: number
          message?: string
        }
      }>
    }>
  }>
}

/**
 * Query Loki for logs using LogQL query_range endpoint
 *
 * @param baseUrl - Loki base URL (e.g., https://loki.rso)
 * @param query - LogQL query string
 * @param startNano - Start timestamp in nanoseconds
 * @param endNano - End timestamp in nanoseconds
 * @param limit - Maximum number of results (default: 100)
 * @returns Loki query response
 */
export async function queryLoki(
  baseUrl: string,
  query: string,
  startNano: string,
  endNano: string,
  limit: number = 100
): Promise<LokiQueryResponse> {
  const params = new URLSearchParams({
    query,
    start: startNano,
    end: endNano,
    limit: String(limit),
    direction: 'backward',
  })

  const response = await fetch(`${baseUrl}/loki/api/v1/query_range?${params.toString()}`)

  if (!response.ok) {
    throw new Error(`Loki query failed: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

/**
 * Query Tempo for a trace by ID
 *
 * @param baseUrl - Tempo base URL (e.g., https://tempo.rso)
 * @param traceId - Trace ID to query
 * @returns Tempo trace response
 */
export async function queryTempoTrace(
  baseUrl: string,
  traceId: string
): Promise<TempoTraceResponse> {
  const response = await fetch(`${baseUrl}/api/v2/traces/${traceId}`)

  if (!response.ok) {
    if (response.status === 404) {
      return {} // Trace not found yet
    }
    throw new Error(`Tempo query failed: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

/**
 * Wait for a condition to be true with retries
 *
 * Useful for waiting for data to be ingested into Loki/Tempo
 *
 * @param condition - Async function that returns true when condition is met
 * @param maxAttempts - Maximum number of retry attempts (default: 10)
 * @param delayMs - Delay between attempts in milliseconds (default: 1000)
 * @returns true if condition was met, false if max attempts reached
 */
export async function waitForCondition(
  condition: () => Promise<boolean>,
  maxAttempts: number = 10,
  delayMs: number = 1000
): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    if (await condition()) {
      return true
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs))
  }
  return false
}

/**
 * Generate a unique test ID for E2E tests
 *
 * @param prefix - Optional prefix for the ID
 * @returns Unique test ID string
 */
export function generateTestId(prefix: string = 'test'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(7)}`
}

/**
 * Convert JavaScript timestamp to Loki nanosecond timestamp
 *
 * @param timestamp - JavaScript timestamp (milliseconds since epoch)
 * @returns Nanosecond timestamp string
 */
export function toNanoseconds(timestamp: number = Date.now()): string {
  return String(timestamp * 1000000)
}

/**
 * Convert JavaScript timestamp to Unix epoch seconds (for Tempo)
 *
 * @param timestamp - JavaScript timestamp (milliseconds since epoch)
 * @returns Unix epoch seconds
 */
export function toEpochSeconds(timestamp: number = Date.now()): number {
  return Math.floor(timestamp / 1000)
}

/**
 * Parse a log line from Loki into a JSON object
 *
 * @param logLine - Raw log line string from Loki
 * @returns Parsed log object
 */
export function parseLogLine(logLine: string): Record<string, any> {
  try {
    return JSON.parse(logLine)
  } catch (error) {
    // If not JSON, return as raw message
    return { message: logLine }
  }
}

/**
 * Find a span in a Tempo trace by name
 *
 * @param trace - Tempo trace response
 * @param spanName - Name of the span to find
 * @returns The span if found, undefined otherwise
 */
export function findSpanByName(
  trace: TempoTraceResponse,
  spanName: string
): TempoTraceResponse['batches'][0]['scopeSpans'][0]['spans'][0] | undefined {
  if (!trace.batches || trace.batches.length === 0) {
    return undefined
  }

  for (const batch of trace.batches) {
    if (!batch.scopeSpans) continue

    for (const scopeSpan of batch.scopeSpans) {
      if (!scopeSpan.spans) continue

      const span = scopeSpan.spans.find((s) => s.name === spanName)
      if (span) return span
    }
  }

  return undefined
}

/**
 * Get resource attribute from Tempo trace
 *
 * @param trace - Tempo trace response
 * @param attributeKey - Attribute key to find
 * @returns Attribute value or undefined
 */
export function getResourceAttribute(
  trace: TempoTraceResponse,
  attributeKey: string
): string | number | undefined {
  if (!trace.batches || trace.batches.length === 0) {
    return undefined
  }

  const attrs = trace.batches[0].resource?.attributes || []
  const attr = attrs.find((a) => a.key === attributeKey)

  if (!attr) return undefined

  return attr.value.stringValue || attr.value.intValue
}

/**
 * HTTP instrumentation hooks
 *
 * Provides request and response hooks for HTTP instrumentation to capture
 * additional attributes from HTTP requests and responses.
 */

import type { Span } from '@opentelemetry/api'

/**
 * Creates an HTTP request hook function
 *
 * The hook captures additional request attributes:
 * - User-Agent header
 * - X-Forwarded-For header
 * - X-Request-ID header
 * - X-Correlation-ID header
 *
 * NOTE: This hook is integration-tested with real HTTP requests.
 * Unit testing requires mocking the HTTP instrumentation request object.
 *
 * @returns Request hook function
 *
 * @example
 * ```typescript
 * new HttpInstrumentation({
 *   requestHook: createHttpRequestHook()
 * })
 * ```
 */
export function createHttpRequestHook() {
  return (span: Span, request: any): void => {
    span.setAttributes({
      'http.user_agent': request.getHeader('user-agent') || 'unknown',
      'http.x_forwarded_for': request.getHeader('x-forwarded-for'),
      'http.x_request_id': request.getHeader('x-request-id'),
      'http.x_correlation_id': request.getHeader('x-correlation-id'),
    })
  }
}

/**
 * Creates an HTTP response hook function
 *
 * The hook captures additional response attributes:
 * - Content-Length header
 * - Content-Type header
 *
 * NOTE: This hook is integration-tested with real HTTP responses.
 * Unit testing requires mocking the HTTP instrumentation response object.
 *
 * @returns Response hook function
 *
 * @example
 * ```typescript
 * new HttpInstrumentation({
 *   responseHook: createHttpResponseHook()
 * })
 * ```
 */
export function createHttpResponseHook() {
  return (span: Span, response: any): void => {
    span.setAttributes({
      'http.response.content_length': response.getHeader('content-length'),
      'http.response.content_type': response.getHeader('content-type'),
    })
  }
}

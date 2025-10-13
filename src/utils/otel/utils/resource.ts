/**
 * Resource builder utility
 *
 * Creates OpenTelemetry Resource instances with semantic conventions for service identification.
 */

import { resourceFromAttributes } from '@opentelemetry/resources'
import {
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_SERVICE_VERSION,
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
} from '@opentelemetry/semantic-conventions'
import type { ResourceOptions } from '../types.js'

/**
 * Creates an OpenTelemetry Resource with service metadata
 *
 * @param options - Resource configuration options
 * @returns Configured Resource instance
 *
 * @example
 * ```typescript
 * const resource = createResource({
 *   serviceName: 'my-api',
 *   serviceVersion: '1.2.3',
 *   environment: 'production'
 * })
 * ```
 */
export function createResource(options: ResourceOptions) {
  const {
    serviceName,
    serviceVersion = '0.0.0',
    environment = process.env.NODE_ENV || 'development',
  } = options

  return resourceFromAttributes({
    [SEMRESATTRS_SERVICE_NAME]: serviceName,
    [SEMRESATTRS_SERVICE_VERSION]: serviceVersion,
    [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: environment,
  })
}

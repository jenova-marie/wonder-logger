/**
 * Graceful shutdown utility
 *
 * Handles graceful shutdown of the OpenTelemetry SDK on process termination signals.
 */

import type { NodeSDK } from '@opentelemetry/sdk-node'

/**
 * Sets up graceful shutdown handlers for the OpenTelemetry SDK
 *
 * Registers signal handlers for SIGTERM and SIGINT that:
 * 1. Log the shutdown signal
 * 2. Shut down the SDK to flush pending telemetry
 * 3. Exit the process with appropriate status code
 *
 * NOTE: Signal handlers are integration-tested in e2e tests, not unit tests.
 * The shutdown logic itself is unit-testable by calling sdk.shutdown() directly.
 *
 * @param sdk - The NodeSDK instance to shut down
 *
 * @example
 * ```typescript
 * const sdk = new NodeSDK({ ... })
 * sdk.start()
 * setupGracefulShutdown(sdk)
 * ```
 */
export function setupGracefulShutdown(sdk: NodeSDK): void {
  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received. Shutting down gracefully...`)
    try {
      await sdk.shutdown()
      console.log('OpenTelemetry SDK shut down successfully')
      process.exit(0)
    } catch (error) {
      console.error('Error during shutdown:', error)
      process.exit(1)
    }
  }

  // NOTE: Signal handlers are not unit-tested as they require sending actual
  // process signals. These are covered by integration tests.
  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}

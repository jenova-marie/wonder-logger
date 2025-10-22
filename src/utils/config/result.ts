/**
 * Domain-Specific Result Wrapper for Config Module
 *
 * Pre-configured Result type and helpers scoped to ConfigError.
 * Eliminates type assertions throughout the config system.
 *
 * @example
 * import { ok, err, type ConfigResult } from './result.js'
 *
 * function loadConfig(): ConfigResult<Config> {
 *   if (!exists(path)) return err(fileNotFound(path))
 *   return ok(config)
 * }
 */

import { type Result } from '@jenova-marie/ts-rust-result'
import { createDomainResult } from '@jenova-marie/ts-rust-result/helpers'
import type { ConfigError } from './errors.js'

/**
 * Domain-specific ok/err helpers pre-configured for ConfigError
 */
export const { ok, err, Result: ConfigResultType } = createDomainResult<ConfigError>()

/**
 * Type alias for config module Results
 *
 * @template T - The success value type
 */
export type ConfigResult<T> = Result<T, ConfigError>

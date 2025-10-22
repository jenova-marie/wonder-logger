/**
 * Domain-Specific Result Wrapper for JSON Parser
 *
 * Pre-configured Result type and helpers scoped to JSONError.
 * Eliminates type assertions throughout the JSON parser.
 *
 * @example
 * import { ok, err, type JSONResult } from './result.js'
 *
 * function parseJSON(text: string): JSONResult<any> {
 *   try {
 *     return ok(JSON.parse(text))
 *   } catch (e) {
 *     return err(jsonParseError(text, e as Error))
 *   }
 * }
 */

import { type Result } from '@jenova-marie/ts-rust-result'
import { createDomainResult } from '@jenova-marie/ts-rust-result/helpers'
import type { JSONError } from './errors.js'

/**
 * Domain-specific ok/err helpers pre-configured for JSONError
 */
export const { ok, err, Result: JSONResultType } = createDomainResult<JSONError>()

/**
 * Type alias for JSON parser Results
 *
 * @template T - The success value type
 */
export type JSONResult<T> = Result<T, JSONError>

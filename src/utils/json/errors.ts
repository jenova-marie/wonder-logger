/**
 * JSON Parser Error Factories
 *
 * Error types for JSON parsing and validation.
 * Uses ts-rust-result 2.2 error infrastructure.
 */

import { error, type DomainError } from '@jenova-marie/ts-rust-result/errors'

/**
 * JSON parsing failed error
 */
export const jsonParseError = (text: string, cause?: Error) =>
  error('JSONParseError')
    .withMessage(
      cause
        ? `Failed to parse JSON: ${cause.message}`
        : 'Failed to parse JSON'
    )
    .withContext({
      textPreview: text.substring(0, 200),
      textLength: text.length,
    })
    .withCause(cause)
    .build()

/**
 * JSON extraction failed error
 */
export const jsonExtractionError = (text: string, directError: Error, extractionError: Error) =>
  error('JSONExtractionError')
    .withMessage(
      `Failed to parse JSON response. ` +
        `Direct parse error: ${directError.message}. ` +
        `Extraction parse error: ${extractionError.message}`
    )
    .withContext({
      textPreview: text.substring(0, 100),
      directErrorMessage: directError.message,
      extractionErrorMessage: extractionError.message,
    })
    .build()

/**
 * JSON structure validation failed error
 */
export const jsonStructureError = (data: any, requiredFields: string[], missingFields: string[]) =>
  error('JSONStructureError')
    .withMessage(
      `JSON validation failed. Missing required fields: ${missingFields.join(', ')}`
    )
    .withContext({
      requiredFields,
      missingFields,
      actualType: typeof data,
      isObject: typeof data === 'object' && data !== null,
    })
    .build()

/**
 * JSON parser error type (union of all possible JSON parsing errors)
 */
export type JSONError = DomainError & {
  kind:
    | 'JSONParseError' // Failed to parse JSON
    | 'JSONExtractionError' // Failed to extract and parse JSON
    | 'JSONStructureError' // JSON structure validation failed
}

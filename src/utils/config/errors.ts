/**
 * Configuration Error Factories
 *
 * Project-specific error types for config loading and parsing.
 * Uses ts-rust-result 2.0 error infrastructure.
 */

import {
  error,
  type DomainError,
  fileNotFound as baseFileNotFound,
  fileReadError as baseFileReadError,
  invalidYAML as baseInvalidYAML,
  schemaValidation as baseSchemaValidation,
} from '@jenova-marie/ts-rust-result/errors'
import type { ZodError } from 'zod'

/**
 * Environment variable interpolation errors
 */

/**
 * Missing required environment variable
 */
export const missingEnvVar = (varName: string, expression: string) =>
  error('MissingEnvVar')
    .withMessage(
      `Required environment variable '${varName}' is not set. ` +
        `Either set the variable or provide a default value: \${${varName}:-default}`
    )
    .withContext({ varName, expression })
    .build()

/**
 * Invalid environment variable syntax
 */
export const invalidEnvVarSyntax = (expression: string) =>
  error('InvalidEnvVarSyntax')
    .withMessage(`Invalid environment variable syntax: ${expression}`)
    .withContext({ expression })
    .build()

/**
 * File system error factories (re-exports from ts-rust-result)
 */

/**
 * Config file not found error
 */
export const fileNotFound = (path: string): ConfigError =>
  baseFileNotFound(path) as ConfigError

/**
 * Config file read error
 */
export const fileReadError = (path: string, cause: Error): ConfigError =>
  baseFileReadError(path, cause.message) as ConfigError

/**
 * YAML parsing error
 */
export const invalidYAML = (filePath: string, cause: Error): ConfigError => {
  // Extract line/column from YAML parser error if available
  const match = cause.message.match(/line (\d+).*column (\d+)/)
  const line = match ? parseInt(match[1], 10) : 0
  const column = match ? parseInt(match[2], 10) : 0

  return baseInvalidYAML(line, column, `${filePath}: ${cause.message}`) as ConfigError
}

/**
 * Schema validation error (from Zod)
 */
export const schemaValidation = (filePath: string, zodError: ZodError): ConfigError => {
  const issues = zodError.issues.map((issue) => ({
    path: issue.path.map(String),
    message: issue.message,
  }))

  return error('SchemaValidation')
    .withMessage(`Config validation failed for '${filePath}'`)
    .withContext({
      filePath,
      issues,
      zodError: zodError.toString(),
    })
    .build() as ConfigError
}

/**
 * Config error type (union of all possible config errors)
 *
 * Combines standard errors from ts-rust-result with project-specific errors
 */
export type ConfigError = DomainError & {
  kind:
    | 'FileNotFound' // From ts-rust-result/errors
    | 'FileReadError' // From ts-rust-result/errors
    | 'InvalidYAML' // From ts-rust-result/errors
    | 'SchemaValidation' // From ts-rust-result/errors (via Zod)
    | 'MissingEnvVar' // Project-specific
    | 'InvalidEnvVarSyntax' // Project-specific
}

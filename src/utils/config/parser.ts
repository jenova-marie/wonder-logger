/**
 * YAML Parser with Environment Variable Interpolation
 *
 * Parses YAML config files and replaces environment variable references.
 *
 * Supported formats:
 * - ${VAR_NAME} - Required variable (returns error if not set)
 * - ${VAR_NAME:-default} - Optional variable with default value
 */

import { parse as parseYAML } from 'yaml'
import { missingEnvVar, invalidEnvVarSyntax } from './errors.js'
import { ok, err, type ConfigResult } from './result.js'

/**
 * Interpolates environment variables in a string
 *
 * @param value - String potentially containing env var references
 * @returns Result containing string with env vars replaced, or error if required var is not set
 *
 * @example
 * interpolateEnvVars('${LOG_LEVEL:-info}') // ok('info') if LOG_LEVEL not set
 * interpolateEnvVars('${SERVICE_NAME}') // err(missingEnvVar(...)) if SERVICE_NAME not set
 */
export function interpolateEnvVars(value: string): ConfigResult<string> {
  // Match ${VAR_NAME} or ${VAR_NAME:-default}
  const envVarRegex = /\$\{([^}:]+)(?::-(.*?))?\}/g

  let error: ReturnType<typeof missingEnvVar> | null = null

  const result = value.replace(envVarRegex, (match, varName, defaultValue) => {
    const envValue = process.env[varName]

    if (envValue !== undefined) {
      return envValue
    }

    if (defaultValue !== undefined) {
      return defaultValue
    }

    error = missingEnvVar(varName, match)
    return match // Return original to avoid mangling
  })

  if (error) {
    return err(error)
  }

  return ok(result)
}

/**
 * Recursively interpolates environment variables in an object
 *
 * @param obj - Object potentially containing env var references in string values
 * @returns Result containing object with all string values interpolated, or error
 */
export function interpolateObject(obj: any): ConfigResult<any> {
  if (typeof obj === 'string') {
    const result = interpolateEnvVars(obj)
    if (!result.ok) {
      return result
    }
    return ok(result.value)
  }

  if (Array.isArray(obj)) {
    const results: any[] = []
    for (const item of obj) {
      const result = interpolateObject(item)
      if (!result.ok) {
        return result
      }
      results.push(result.value)
    }
    return ok(results)
  }

  if (obj !== null && typeof obj === 'object') {
    const result: any = {}
    for (const [key, value] of Object.entries(obj)) {
      const interpolated = interpolateObject(value)
      if (!interpolated.ok) {
        return interpolated
      }
      result[key] = interpolated.value
    }
    return ok(result)
  }

  return ok(obj)
}

/**
 * Parses YAML string and interpolates environment variables
 *
 * @param yamlContent - Raw YAML string
 * @returns Result containing parsed and interpolated object, or error
 *
 * @example
 * const result = parseYamlWithEnv(`
 *   service:
 *     name: \${SERVICE_NAME}
 *     environment: \${NODE_ENV:-development}
 * `)
 * if (result.ok) {
 *   const config = result.value
 * }
 */
export function parseYamlWithEnv(yamlContent: string): ConfigResult<any> {
  let parsed: any
  try {
    // Parse YAML
    parsed = parseYAML(yamlContent)
  } catch (error) {
    // YAML parsing error - use a generic error message
    return err(
      invalidEnvVarSyntax(
        error instanceof Error ? error.message : String(error)
      )
    )
  }

  // Interpolate environment variables
  return interpolateObject(parsed)
}

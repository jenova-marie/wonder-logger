/**
 * YAML Parser with Environment Variable Interpolation
 *
 * Parses YAML config files and replaces environment variable references.
 *
 * Supported formats:
 * - ${VAR_NAME} - Required variable (throws if not set)
 * - ${VAR_NAME:-default} - Optional variable with default value
 */

import { parse as parseYAML } from 'yaml'

/**
 * Interpolates environment variables in a string
 *
 * @param value - String potentially containing env var references
 * @returns String with env vars replaced
 * @throws Error if required env var is not set
 *
 * @example
 * interpolateEnvVars('${LOG_LEVEL:-info}') // returns 'info' if LOG_LEVEL not set
 * interpolateEnvVars('${SERVICE_NAME}') // throws if SERVICE_NAME not set
 */
export function interpolateEnvVars(value: string): string {
  // Match ${VAR_NAME} or ${VAR_NAME:-default}
  const envVarRegex = /\$\{([^}:]+)(?::-(.*?))?\}/g

  return value.replace(envVarRegex, (match, varName, defaultValue) => {
    const envValue = process.env[varName]

    if (envValue !== undefined) {
      return envValue
    }

    if (defaultValue !== undefined) {
      return defaultValue
    }

    throw new Error(
      `Required environment variable '${varName}' is not set. ` +
        `Either set the variable or provide a default value: \${${varName}:-default}`
    )
  })
}

/**
 * Recursively interpolates environment variables in an object
 *
 * @param obj - Object potentially containing env var references in string values
 * @returns Object with all string values interpolated
 */
export function interpolateObject(obj: any): any {
  if (typeof obj === 'string') {
    return interpolateEnvVars(obj)
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => interpolateObject(item))
  }

  if (obj !== null && typeof obj === 'object') {
    const result: any = {}
    for (const [key, value] of Object.entries(obj)) {
      result[key] = interpolateObject(value)
    }
    return result
  }

  return obj
}

/**
 * Parses YAML string and interpolates environment variables
 *
 * @param yamlContent - Raw YAML string
 * @returns Parsed and interpolated object
 * @throws Error if YAML is invalid or required env vars are missing
 *
 * @example
 * const config = parseYamlWithEnv(`
 *   service:
 *     name: \${SERVICE_NAME}
 *     environment: \${NODE_ENV:-development}
 * `)
 */
export function parseYamlWithEnv(yamlContent: string): any {
  try {
    // Parse YAML
    const parsed = parseYAML(yamlContent)

    // Interpolate environment variables
    return interpolateObject(parsed)
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to parse YAML config: ${error.message}`)
    }
    throw error
  }
}

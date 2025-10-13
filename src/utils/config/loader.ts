/**
 * Configuration File Loader
 *
 * Discovers and loads wonder-logger.yaml config files from the project root.
 */

import fs from 'fs'
import path from 'path'
import { parseYamlWithEnv } from './parser'
import { configSchema, type WonderLoggerConfig } from './schema'

/**
 * Default config file name
 */
export const DEFAULT_CONFIG_FILE = 'wonder-logger.yaml'

/**
 * Finds the config file in the current working directory
 *
 * @param fileName - Config file name (defaults to 'wonder-logger.yaml')
 * @returns Absolute path to config file, or null if not found
 */
export function findConfigFile(fileName: string = DEFAULT_CONFIG_FILE): string | null {
  const configPath = path.resolve(process.cwd(), fileName)

  if (fs.existsSync(configPath)) {
    return configPath
  }

  return null
}

/**
 * Loads and validates config from a file
 *
 * @param filePath - Absolute path to config file
 * @returns Validated configuration object
 * @throws Error if file doesn't exist, is invalid YAML, or fails validation
 */
export function loadConfigFromFile(filePath: string): WonderLoggerConfig {
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    throw new Error(`Config file not found: ${filePath}`)
  }

  // Read file content
  let yamlContent: string
  try {
    yamlContent = fs.readFileSync(filePath, 'utf-8')
  } catch (error) {
    throw new Error(
      `Failed to read config file '${filePath}': ${error instanceof Error ? error.message : String(error)}`
    )
  }

  // Parse YAML with env var interpolation
  let parsed: any
  try {
    parsed = parseYamlWithEnv(yamlContent)
  } catch (error) {
    throw new Error(
      `Failed to parse config file '${filePath}': ${error instanceof Error ? error.message : String(error)}`
    )
  }

  // Validate against schema
  const result = configSchema.safeParse(parsed)

  if (!result.success) {
    const errors = result.error.issues.map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`).join('\n')

    throw new Error(`Config validation failed for '${filePath}':\n${errors}`)
  }

  return result.data
}

/**
 * Loads config from default location or provided path
 *
 * @param options - Optional configuration
 * @param options.configPath - Custom config file path
 * @param options.required - Whether config file is required (defaults to true)
 * @returns Validated configuration object, or null if not required and not found
 * @throws Error if config is required but not found, or if validation fails
 *
 * @example
 * // Load from default location (wonder-logger.yaml in cwd)
 * const config = loadConfig()
 *
 * // Load from custom path
 * const config = loadConfig({ configPath: './config/custom.yaml' })
 *
 * // Optional config (returns null if not found)
 * const config = loadConfig({ required: false })
 */
export function loadConfig(options: {
  configPath?: string
  required?: boolean
} = {}): WonderLoggerConfig | null {
  const { configPath, required = true } = options

  // Use provided path or discover default
  const filePath = configPath || findConfigFile()

  if (!filePath) {
    if (required) {
      throw new Error(
        `Config file '${DEFAULT_CONFIG_FILE}' not found in current directory. ` +
          `Please create a config file or specify a custom path.`
      )
    }
    return null
  }

  return loadConfigFromFile(filePath)
}

/**
 * Configuration File Loader
 *
 * Discovers and loads wonder-logger.yaml config files from the project root.
 */

import fs from 'fs'
import path from 'path'
import { parseYamlWithEnv } from './parser.js'
import { configSchema, type WonderLoggerConfig } from './schema.js'
import {
  fileNotFound,
  fileReadError,
  schemaValidation,
} from './errors.js'
import { ok, err, type ConfigResult } from './result.js'

/**
 * Default config file name
 */
export const DEFAULT_CONFIG_FILE = 'wonder-logger.yaml'

/**
 * Finds the config file in the current working directory
 *
 * @param fileName - Config file name (defaults to 'wonder-logger.yaml')
 * @returns Result containing absolute path to config file, or error if not found
 */
export function findConfigFile(
  fileName: string = DEFAULT_CONFIG_FILE
): ConfigResult<string> {
  const configPath = path.resolve(process.cwd(), fileName)

  if (fs.existsSync(configPath)) {
    return ok(configPath)
  }

  return err(fileNotFound(configPath))
}

/**
 * Loads and validates config from a file
 *
 * @param filePath - Absolute path to config file
 * @returns Result containing validated configuration object with _configDir metadata, or error
 */
export function loadConfigFromFile(
  filePath: string
): ConfigResult<WonderLoggerConfig> {
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    return err(fileNotFound(filePath))
  }

  // Capture the directory containing the config file
  const configDir = path.dirname(path.resolve(filePath))

  // Read file content
  let yamlContent: string
  try {
    yamlContent = fs.readFileSync(filePath, 'utf-8')
  } catch (error) {
    return err(
      fileReadError(
        filePath,
        error instanceof Error ? error : new Error(String(error))
      )
    )
  }

  // Parse YAML with env var interpolation
  const parseResult = parseYamlWithEnv(yamlContent)
  if (!parseResult.ok) {
    // parseResult.error is already a ConfigError - propagate directly
    return parseResult
  }

  const parsed = parseResult.value

  // Add config directory as metadata for relative path resolution
  parsed._configDir = configDir

  // Validate against schema
  const zodResult = configSchema.safeParse(parsed)

  if (!zodResult.success) {
    return err(schemaValidation(filePath, zodResult.error))
  }

  return ok(zodResult.data)
}

/**
 * Loads config from default location or provided path
 *
 * @param options - Optional configuration
 * @param options.configPath - Custom config file path
 * @param options.required - Whether config file is required (defaults to true)
 * @returns Result containing validated configuration object, or error
 *
 * @example
 * // Load from default location (wonder-logger.yaml in cwd)
 * const result = loadConfig()
 * if (result.ok) {
 *   const config = result.value
 * }
 *
 * // Load from custom path
 * const result = loadConfig({ configPath: './config/custom.yaml' })
 *
 * // Optional config (returns FileNotFound error if not found)
 * const result = loadConfig({ required: false })
 */
export function loadConfig(options: {
  configPath?: string
  required?: boolean
} = {}): ConfigResult<WonderLoggerConfig> {
  const { configPath, required = true } = options

  // Use provided path or discover default
  const findResult = configPath
    ? ok(configPath)
    : findConfigFile()

  if (!findResult.ok) {
    return findResult
  }

  return loadConfigFromFile(findResult.value)
}

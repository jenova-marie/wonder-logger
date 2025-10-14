/**
 * Integration tests for config file relative path resolution
 *
 * These tests verify that relative paths in config files are resolved
 * relative to the config file location, not process.cwd()
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { loadConfigFromFile, loadConfig } from '../../../src/utils/config/index.js'
import { createLoggerFromConfig } from '../../../src/utils/logger/config.js'
import fs from 'fs'
import path from 'path'
import os from 'os'

describe('Config Integration - Relative Path Resolution', () => {
  let tempDir: string
  let configDir: string
  let configPath: string

  beforeEach(() => {
    // Create temporary directory structure
    tempDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'wonder-logger-test-')))
    configDir = path.join(tempDir, 'config')
    fs.mkdirSync(configDir, { recursive: true })
    configPath = path.join(configDir, 'wonder-logger.yaml')
  })

  afterEach(async () => {
    // Small delay to allow Pino worker threads to finish
    await new Promise(resolve => setTimeout(resolve, 100))

    // Clean up temporary directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it('should capture config directory when loading config file', () => {
    // Create a minimal config file
    const configContent = `
service:
  name: test-service
  version: 1.0.0
  environment: test

logger:
  enabled: true
  level: info
  transports: []

otel:
  enabled: false
`
    fs.writeFileSync(configPath, configContent, 'utf-8')

    // Load config
    const config = loadConfigFromFile(configPath)

    // Verify _configDir is set to the directory containing the config file
    expect(config._configDir).toBe(configDir)
  })

  it('should resolve relative file transport paths relative to config directory', () => {
    // Create config with relative path for file transport
    const configContent = `
service:
  name: test-service
  version: 1.0.0
  environment: test

logger:
  enabled: true
  level: info
  transports:
    - type: file
      dir: ./logs
      fileName: app.log

otel:
  enabled: false
`
    fs.writeFileSync(configPath, configContent, 'utf-8')

    // Load config
    const config = loadConfigFromFile(configPath)

    // Verify _configDir is set
    expect(config._configDir).toBe(configDir)

    // Create logger from config
    // This will test that buildTransport resolves the path correctly
    const logger = createLoggerFromConfig({ configPath, required: true })

    // Verify logger was created successfully
    expect(logger).toBeDefined()

    // Verify log directory was created relative to config dir, not process.cwd()
    const expectedLogDir = path.join(configDir, 'logs')
    expect(fs.existsSync(expectedLogDir)).toBe(true)
  })

  it('should keep absolute file transport paths as-is', () => {
    // Create absolute path for logs
    const absoluteLogDir = path.join(tempDir, 'absolute-logs')

    // Create config with absolute path
    const configContent = `
service:
  name: test-service
  version: 1.0.0
  environment: test

logger:
  enabled: true
  level: info
  transports:
    - type: file
      dir: ${absoluteLogDir}
      fileName: app.log

otel:
  enabled: false
`
    fs.writeFileSync(configPath, configContent, 'utf-8')

    // Create logger from config
    const logger = createLoggerFromConfig({ configPath, required: true })

    // Verify logger was created successfully
    expect(logger).toBeDefined()

    // Verify log directory was created at the absolute path
    expect(fs.existsSync(absoluteLogDir)).toBe(true)
  })

  it('should handle nested relative paths correctly', () => {
    // Create config with nested relative path
    const configContent = `
service:
  name: test-service
  version: 1.0.0
  environment: test

logger:
  enabled: true
  level: info
  transports:
    - type: file
      dir: ./data/logs/app
      fileName: test.log

otel:
  enabled: false
`
    fs.writeFileSync(configPath, configContent, 'utf-8')

    // Create logger from config
    const logger = createLoggerFromConfig({ configPath, required: true })

    // Verify logger was created successfully
    expect(logger).toBeDefined()

    // Verify nested directory was created relative to config dir
    const expectedLogDir = path.join(configDir, 'data', 'logs', 'app')
    expect(fs.existsSync(expectedLogDir)).toBe(true)
  })

  it('should resolve parent directory references correctly', () => {
    // Create config with parent directory reference
    const configContent = `
service:
  name: test-service
  version: 1.0.0
  environment: test

logger:
  enabled: true
  level: info
  transports:
    - type: file
      dir: ../logs
      fileName: app.log

otel:
  enabled: false
`
    fs.writeFileSync(configPath, configContent, 'utf-8')

    // Create logger from config
    const logger = createLoggerFromConfig({ configPath, required: true })

    // Verify logger was created successfully
    expect(logger).toBeDefined()

    // Verify log directory was created relative to config dir's parent
    const expectedLogDir = path.join(tempDir, 'logs')
    expect(fs.existsSync(expectedLogDir)).toBe(true)
  })

  it('should work with config file in current directory', () => {
    // Save current directory
    const originalCwd = process.cwd()

    try {
      // Change to config directory
      process.chdir(configDir)

      // Create config file in current directory
      const localConfigPath = path.join(configDir, 'wonder-logger.yaml')
      const configContent = `
service:
  name: test-service
  version: 1.0.0
  environment: test

logger:
  enabled: true
  level: info
  transports:
    - type: file
      dir: ./logs
      fileName: app.log

otel:
  enabled: false
`
      fs.writeFileSync(localConfigPath, configContent, 'utf-8')

      // Load config using default discovery (should find it in cwd)
      const config = loadConfig({ required: true })

      // Verify _configDir is set to current directory
      expect(config._configDir).toBe(configDir)

      // Create logger
      const logger = createLoggerFromConfig({ required: true })

      // Verify log directory was created in the right place
      const expectedLogDir = path.join(configDir, 'logs')
      expect(fs.existsSync(expectedLogDir)).toBe(true)
    } finally {
      // Restore original directory
      process.chdir(originalCwd)
    }
  })
})

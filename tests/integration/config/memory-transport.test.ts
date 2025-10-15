/**
 * Integration tests for memory transport via config
 *
 * Verifies that memory transport can be configured via YAML and works correctly
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { loadConfigFromFile } from '../../../src/utils/config/index.js'
import { createLoggerFromConfig } from '../../../src/utils/logger/config.js'
import {
  getMemoryLogs,
  clearMemoryLogs,
  getMemoryLogSize,
  disposeMemoryStore,
} from '../../../src/utils/logger/transports/memory.js'
import fs from 'fs'
import path from 'path'
import os from 'os'

describe('Config Integration - Memory Transport', () => {
  let tempDir: string
  let configPath: string

  beforeEach(() => {
    // Create temporary directory
    tempDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'wonder-logger-test-')))
    configPath = path.join(tempDir, 'wonder-logger.yaml')

    // Dispose memory stores before each test to ensure clean state
    disposeMemoryStore('test-service')
    disposeMemoryStore('custom-registry')
    disposeMemoryStore('store-1')
    disposeMemoryStore('store-2')
  })

  afterEach(async () => {
    // Dispose memory stores completely
    disposeMemoryStore('test-service')
    disposeMemoryStore('custom-registry')
    disposeMemoryStore('store-1')
    disposeMemoryStore('store-2')

    // Small delay for cleanup
    await new Promise(resolve => setTimeout(resolve, 100))

    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it('should create memory transport from YAML config', () => {
    const configContent = `
service:
  name: test-service
  version: 1.0.0
  environment: test

logger:
  enabled: true
  level: debug  # Logger level must be debug or below to emit debug logs
  transports:
    - type: memory
      maxSize: 5000
      level: debug

otel:
  enabled: false
`
    fs.writeFileSync(configPath, configContent, 'utf-8')

    // Create logger from config
    const logger = createLoggerFromConfig({ configPath })

    // Log some messages
    logger.info('Test message 1')
    logger.debug('Test message 2')
    logger.warn('Test message 3')

    // Query logs
    const logs = getMemoryLogs('test-service')

    // Verify logs were stored
    expect(logs.length).toBe(3)
    expect(logs[0].msg).toBe('Test message 1')
    expect(logs[1].msg).toBe('Test message 2')
    expect(logs[2].msg).toBe('Test message 3')
  })

  it('should use custom registry name from config', () => {
    const configContent = `
service:
  name: test-service
  version: 1.0.0
  environment: test

logger:
  enabled: true
  level: info
  transports:
    - type: memory
      name: custom-registry
      maxSize: 1000
      level: info

otel:
  enabled: false
`
    fs.writeFileSync(configPath, configContent, 'utf-8')

    // Create logger from config
    const logger = createLoggerFromConfig({ configPath })

    // Log messages
    logger.info('Custom registry message')

    // Query using custom name
    const logs = getMemoryLogs('custom-registry')

    expect(logs.length).toBe(1)
    expect(logs[0].msg).toBe('Custom registry message')
    expect(logs[0].service).toBe('test-service')
  })

  it('should respect maxSize limit', () => {
    const configContent = `
service:
  name: test-service
  version: 1.0.0
  environment: test

logger:
  enabled: true
  level: info
  transports:
    - type: memory
      maxSize: 3
      level: info

otel:
  enabled: false
`
    fs.writeFileSync(configPath, configContent, 'utf-8')

    // Create logger from config
    const logger = createLoggerFromConfig({ configPath })

    // Log more messages than maxSize
    logger.info('Message 1')
    logger.info('Message 2')
    logger.info('Message 3')
    logger.info('Message 4')
    logger.info('Message 5')

    // Query logs
    const logs = getMemoryLogs('test-service')

    // Should only keep last 3 (circular buffer)
    expect(logs.length).toBe(3)
    expect(logs[0].msg).toBe('Message 3')
    expect(logs[1].msg).toBe('Message 4')
    expect(logs[2].msg).toBe('Message 5')
  })

  it('should allow querying logs by level', () => {
    const configContent = `
service:
  name: test-service
  version: 1.0.0
  environment: test

logger:
  enabled: true
  level: trace  # Logger emits all levels
  transports:
    - type: memory
      maxSize: 1000
      level: trace

otel:
  enabled: false
`
    fs.writeFileSync(configPath, configContent, 'utf-8')

    // Create logger from config
    const logger = createLoggerFromConfig({ configPath })

    // Log at different levels
    logger.trace('Trace message')
    logger.debug('Debug message')
    logger.info('Info message')
    logger.warn('Warn message')
    logger.error('Error message')

    // Query all logs
    const allLogs = getMemoryLogs('test-service')
    expect(allLogs.length).toBe(5)

    // Query only warn and error using level filter
    const warnAndErrorLogs = getMemoryLogs('test-service', {
      level: ['warn', 'error'],
    })
    expect(warnAndErrorLogs.length).toBe(2)
    expect(warnAndErrorLogs[0].msg).toBe('Warn message')
    expect(warnAndErrorLogs[1].msg).toBe('Error message')
  })

  it('should support querying with filters', async () => {
    const configContent = `
service:
  name: test-service
  version: 1.0.0
  environment: test

logger:
  enabled: true
  level: info
  transports:
    - type: memory
      maxSize: 1000

otel:
  enabled: false
`
    fs.writeFileSync(configPath, configContent, 'utf-8')

    // Create logger from config
    const logger = createLoggerFromConfig({ configPath })

    // Log messages with timestamps
    const startTime = Date.now()
    logger.info('Old message')

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 100))

    logger.error('Recent error')
    logger.warn('Recent warning')

    // Query only recent logs
    const recentLogs = getMemoryLogs('test-service', {
      since: startTime + 50,
    })

    expect(recentLogs.length).toBe(2)
    expect(recentLogs[0].msg).toBe('Recent error')

    // Query only errors
    const errorLogs = getMemoryLogs('test-service', {
      level: 'error',
    })

    expect(errorLogs.length).toBe(1)
    expect(errorLogs[0].msg).toBe('Recent error')
  })

  it('should work with multiple memory transports', () => {
    const configContent = `
service:
  name: test-service
  version: 1.0.0
  environment: test

logger:
  enabled: true
  level: info
  transports:
    - type: memory
      name: store-1
      maxSize: 1000
      level: info

    - type: memory
      name: store-2
      maxSize: 500
      level: error

otel:
  enabled: false
`
    fs.writeFileSync(configPath, configContent, 'utf-8')

    // Create logger from config
    const logger = createLoggerFromConfig({ configPath })

    // Log at different levels
    logger.info('Info message')
    logger.error('Error message')

    // Both stores should have error message
    const store1Logs = getMemoryLogs('store-1')
    const store2Logs = getMemoryLogs('store-2')

    // store-1 has both (level: info)
    expect(store1Logs.length).toBe(2)

    // store-2 has only error (level: error)
    expect(store2Logs.length).toBe(1)
    expect(store2Logs[0].msg).toBe('Error message')
  })
})

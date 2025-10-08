/**
 * Integration test setup
 * Ensures base directories exist before tests run and suppresses async file errors
 */

import { mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { beforeAll } from 'vitest'
import { vi } from 'vitest'

beforeAll(() => {
  const logsDir = join(process.cwd(), 'tests', 'integration', 'logs')
  if (!existsSync(logsDir)) {
    mkdirSync(logsDir, { recursive: true })
  }

  // Suppress console errors from pino worker threads during test cleanup
  const originalError = console.error
  console.error = (...args: any[]) => {
    const message = args.join(' ')
    // Suppress ENOENT mkdir errors from pino transports
    if (message.includes('ENOENT') && message.includes('mkdir')) {
      return
    }
    originalError.apply(console, args)
  }
})

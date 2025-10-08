import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    setupFiles: ['./tests/integration/setup.ts'],
    // Don't fail test run on background errors from pino file transport cleanup
    dangerouslyIgnoreUnhandledErrors: true,
    onConsoleLog(log) {
      // Suppress pino file transport worker errors during test cleanup
      if (log.includes('ENOENT') && log.includes('mkdir')) {
        return false
      }
    },
  },
})

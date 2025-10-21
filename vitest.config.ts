import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    setupFiles: ['./tests/integration/setup.ts'],
    // Don't fail test run on background errors from pino file transport cleanup
    dangerouslyIgnoreUnhandledErrors: true,
    // E2E tests use self-signed certificates (SPIFFE/SPIRE via Caddy)
    // Node's fetch() doesn't inherit macOS Keychain trust, so we disable TLS validation
    env: {
      NODE_TLS_REJECT_UNAUTHORIZED: '0',
    },
    onConsoleLog(log) {
      // Suppress pino file transport worker errors during test cleanup
      if (log.includes('ENOENT') && log.includes('mkdir')) {
        return false
      }
    },
  },
})

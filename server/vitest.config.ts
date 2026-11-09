import { defineConfig } from 'vitest/config'

// The tests read TEST_DATABASE_URL from the repo's root .env
// (copied from .env.example).
try {
  process.loadEnvFile(new URL('../.env', import.meta.url))
} catch {
  throw new Error('No .env at the repo root. Run `cp .env.example .env` there first.')
}

export default defineConfig({
  test: {
    environment: 'node',
    // The API tests share one database; running files in parallel would let
    // them contend for the same rows and locks.
    fileParallelism: false,
  },
})

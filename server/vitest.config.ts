import { defineConfig } from 'vitest/config'

// The tests read TEST_DATABASE_URL from the repo's shared .env.
process.loadEnvFile(new URL('../.env', import.meta.url))

export default defineConfig({
  test: {
    environment: 'node',
    // The API tests share one database; running files in parallel would let
    // them contend for the same rows and locks.
    fileParallelism: false,
  },
})

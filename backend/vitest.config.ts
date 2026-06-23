import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: [
      '../tests/unit/adapters/**/*.test.ts',
      '../tests/unit/orchestrator/**/*.test.ts',
      '../tests/unit/server/**/*.test.ts',
      '../tests/unit/storage/**/*.test.ts',
      '../tests/integration/backend/**/*.test.ts',
    ],
    environment: 'node',
    globals: false,
  },
})

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
    exclude: ['tests/e2e/**', 'node_modules/**'],
    globalSetup: ['tests/setup/global-setup.ts'],
    env: {
      DATABASE_PATH: '/tmp/test-db.sqlite',
    },
    fileParallelism: false,
  },
});
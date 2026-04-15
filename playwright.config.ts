import { defineConfig, devices } from '@playwright/test';

const PORT = 3100;
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',

  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: process.env.CI ? 'node .output/server/index.mjs' : 'npm run dev',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      PORT: String(PORT),
      NITRO_PORT: String(PORT),
      DATABASE_PATH: '/tmp/test-e2e.sqlite',
      ENCRYPTION_KEY: 'playwright-test-encryption-key',
      ADMIN_TOKEN: 'playwright-test-admin-token',
      NUXT_PUBLIC_ADMIN_TOKEN: 'playwright-test-admin-token',
    },
  },
});
import { defineConfig, devices } from '@playwright/test';

const baseURL = 'http://127.0.0.1:3100';

export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: './tests/e2e/global-setup.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: Boolean(process.env.CI),
  timeout: 60000,
  reporter: [['list'], ['html', { open: 'never' }]],
  outputDir: 'test-results',
  use: {
    baseURL,
    locale: 'fr-FR',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    // Nest serves both the compiled frontend and Socket.IO. Do not load the local .env.
    command: 'node apps/server/dist/main.js',
    url: `${baseURL}/api/health`,
    reuseExistingServer: false,
    timeout: 60000,
    env: { NODE_ENV: 'test', PORT: '3100', HOST: '127.0.0.1', PUBLIC_ORIGIN: baseURL },
  },
});

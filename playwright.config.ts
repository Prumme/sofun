import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e', fullyParallel: true, timeout: 60000,
  use: { baseURL: 'http://127.0.0.1:3100', trace: 'retain-on-failure' },
  projects: [ { name: 'desktop', use: { ...devices['Desktop Chrome'] } }, { name: 'mobile', use: { ...devices['Pixel 7'] } } ],
  webServer: { command: 'pnpm start', url: 'http://127.0.0.1:3100/api/health', reuseExistingServer: false, env: { PORT: '3100', HOST: '127.0.0.1' } },
});

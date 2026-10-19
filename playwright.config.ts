import { defineConfig, devices } from '@playwright/test';

// End-to-end tests run against the production build (client served by the game server).
// Build first: `npm run build`, or use `npm run test:e2e`, which does both.
const PORT = 4300;

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } }],
  webServer: {
    command: 'node server/dist/index.js',
    url: `http://localhost:${PORT}/api/health`,
    // Late leads arrive after 6 seconds instead of 5 minutes, so the test doesn't wait.
    env: { PORT: String(PORT), LATE_LEAD_SECONDS: '6' },
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});

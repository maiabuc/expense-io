import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  globalSetup: './tests/support/global-setup.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: true,
  timeout: 30000,
  expect: { timeout: 4000 },
  outputDir: 'test-results/browser',
  reporter: [['./tests/reporters/issues.ts']],
  use: {
    baseURL: process.env.TEST_BASE_URL ?? 'http://127.0.0.1:13420',
    locale: 'fr-FR', timezoneId: 'Europe/Paris',
    screenshot: 'only-on-failure',
    // Les traces navigateur brutes contiennent des cookies ; ne pas les publier.
    trace: 'off', video: 'off',
  },
  projects: [
    { name: 'api', testMatch: 'api/**/*.spec.ts' },
    { name: 'e2e', testMatch: 'e2e/**/*.spec.ts', use: { browserName: 'chromium' } },
  ],
})

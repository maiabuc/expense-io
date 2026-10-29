import { defineConfig } from '@playwright/test'

// Assertions et fixtures de NathanPrats/expense-io#4 conservées au SHA dfcd4a1.
// Les services sont créés et détruits exclusivement par scripts/ci/run.mjs upstream.
export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: true,
  timeout: 60000,
  expect: { timeout: 10000 },
  outputDir: 'test-results/upstream',
  reporter: [['list'], ['json', { outputFile: 'reports/upstream.json' }]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://127.0.0.1:13420',
    locale: 'fr-FR', timezoneId: 'Europe/Paris',
    trace: 'off', video: 'off', screenshot: 'only-on-failure',
    browserName: 'chromium',
  },
})

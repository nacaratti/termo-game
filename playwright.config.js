// @ts-check
import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config para o Kinto.
 *
 * Roda E2E contra produção (kinto.fun) ou contra o servidor local
 * de preview, dependendo de PLAYWRIGHT_BASE_URL.
 *
 * IMPORTANTE: estes testes NÃO são executados por `npm test`.
 * Use `npm run test:e2e` ou via Task Scheduler (run-e2e.bat).
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 1,            // 1 retry para mitigar flakiness de rede
  workers: 1,            // contra produção, evita rate-limit
  reporter: [
    ['list'],
    ['json', { outputFile: 'playwright-report/results.json' }],
  ],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'https://kinto.fun',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});

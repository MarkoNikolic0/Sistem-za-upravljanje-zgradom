import { defineConfig } from '@playwright/test';
import { ADRESA_POMOCI } from './e2e/pomoc/svet';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env['CI'],
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  globalTeardown: './e2e/pomoc/kraj.ts',
  use: {
    baseURL: process.env['PLAYWRIGHT_TEST_BASE_URL'] ?? 'http://localhost:4300',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'telefon',
      use: {
        browserName: 'chromium',
        viewport: { width: 375, height: 812 },
        isMobile: true,
        hasTouch: true,
        locale: 'sr-Latn-RS',
        timezoneId: 'Europe/Belgrade',
      },
    },
  ],
  webServer: {
    command: 'npm run test:pregledac',
    cwd: '../backend',
    url: `${ADRESA_POMOCI}/svet`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});

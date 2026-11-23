import { defineConfig } from '@playwright/test';

const port = process.env.E2E_PORT ?? '8082';

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  // Own port, never reused: a dev server left running on 8081 once served stale code to the tests.
  // E2E_PORT moves it when another project's server already holds 8082.
  use: { baseURL: `http://localhost:${port}`, trace: 'retain-on-failure' },
  webServer: { command: `npx expo start --web --port ${port}`, url: `http://localhost:${port}`, reuseExistingServer: false, timeout: 180_000, env: { CI: '1' } },
  projects: [
    { name: 'iphone-se', use: { viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true } },
    { name: 'desktop', use: { viewport: { width: 1280, height: 800 } } },
  ],
});

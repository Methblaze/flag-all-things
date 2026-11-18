import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:8081', trace: 'retain-on-failure' },
  webServer: { command: 'npx expo start --web --port 8081', url: 'http://localhost:8081', reuseExistingServer: true, timeout: 180_000, env: { CI: '1' } },
  projects: [
    { name: 'iphone-se', use: { viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true } },
    { name: 'desktop', use: { viewport: { width: 1280, height: 800 } } },
  ],
});

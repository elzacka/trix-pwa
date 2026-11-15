import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: 'e2e',
  // One at a time: WebKit keeps one OPFS for every profile.
  workers: 1,
  use: { baseURL: 'http://localhost:4173/' },
  webServer: { command: 'npx vite build && npx vite preview --port 4173 --strictPort', url: 'http://localhost:4173/', reuseExistingServer: false, timeout: 120000 },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    // Firefox does not start in the local sandbox; CI runs it.
    ...(process.env.CI ? [{ name: 'firefox', use: { ...devices['Desktop Firefox'] } }] : []),
    { name: 'mobil', use: { ...devices['iPhone 15'] } },
  ],
})

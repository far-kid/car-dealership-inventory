import { defineConfig, devices } from '@playwright/test'

const python = process.env.E2E_PYTHON ?? (process.platform === 'win32' ? '../backend/.venv/Scripts/python.exe' : '../backend/.venv/bin/python')

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 8_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1050 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'], defaultBrowserType: 'chromium' } },
  ],
  webServer: [
    { command: `"${python}" e2e/start_api.py`, url: 'http://127.0.0.1:8000/api/health', reuseExistingServer: false, timeout: 60_000 },
    { command: 'npm run dev', url: 'http://127.0.0.1:5173', reuseExistingServer: false, timeout: 60_000 },
  ],
})

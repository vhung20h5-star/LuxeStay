import { defineConfig, devices } from "@playwright/test";

const apiPort = Number(process.env.E2E_API_PORT ?? 4000);
const webPort = Number(process.env.E2E_WEB_PORT ?? 3000);
const apiBaseUrl = `http://127.0.0.1:${apiPort}`;
const webBaseUrl = `http://127.0.0.1:${webPort}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  timeout: 45_000,
  expect: {
    timeout: 10_000,
  },
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: webBaseUrl,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "node apps/api/dist/index.js",
      url: `${apiBaseUrl}/health`,
      reuseExistingServer: !process.env.CI && !process.env.E2E_API_PORT,
      timeout: 30_000,
      env: {
        PORT: String(apiPort),
        NODE_ENV: "development",
        STORAGE_DRIVER: "memory",
        PAYMENT_SANDBOX_ENABLED: "true",
        CORS_ORIGINS: `${webBaseUrl},http://localhost:${webPort}`,
      },
    },
    {
      command: `npm run start --workspace=@luxestay/web -- --port ${webPort}`,
      url: webBaseUrl,
      reuseExistingServer: !process.env.CI && !process.env.E2E_WEB_PORT,
      timeout: 60_000,
      env: {
        PORT: String(webPort),
        NEXT_PUBLIC_DATA_MODE: "api",
        NEXT_PUBLIC_API_BASE_URL: apiBaseUrl,
        API_BASE_URL: apiBaseUrl,
      },
    },
  ],
});

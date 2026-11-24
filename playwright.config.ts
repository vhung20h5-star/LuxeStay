import { defineConfig, devices } from "@playwright/test";

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
    baseURL: "http://127.0.0.1:3000",
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
      url: "http://127.0.0.1:4000/health",
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
      env: {
        PORT: "4000",
        NODE_ENV: "development",
        STORAGE_DRIVER: "memory",
        PAYMENT_SANDBOX_ENABLED: "true",
        CORS_ORIGINS: "http://127.0.0.1:3000,http://localhost:3000",
      },
    },
    {
      command: "npm run start --workspace=@luxestay/web",
      url: "http://127.0.0.1:3000",
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: {
        PORT: "3000",
        NEXT_PUBLIC_DATA_MODE: "api",
        NEXT_PUBLIC_API_BASE_URL: "http://127.0.0.1:4000",
        API_INTERNAL_BASE_URL: "http://127.0.0.1:4000",
      },
    },
  ],
});

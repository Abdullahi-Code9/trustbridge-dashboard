import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for TrustBridge Dashboard maintainer E2E tests.
 *
 * These tests run against a locally-started Next.js dev server.
 * Set E2E_BASE_URL to override the target (useful in CI against a staging URL).
 *
 * To run: npx playwright test
 * To show report: npx playwright show-report
 */
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  fullyParallel: false,
  reporter: process.env.CI ? "github" : "list",

  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  // Spin up `next dev` automatically unless E2E_BASE_URL is overridden
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});

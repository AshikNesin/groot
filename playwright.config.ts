import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: false, // Run sequentially to avoid browser conflicts
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker to avoid parallel browser issues
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    // Use headed mode for local development (works better on macOS)
    headless: !!process.env.CI,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    // Start the dev server directly via tsx (bypassing the `pnpm dev` portless
    // wrapper, which conflicts with Playwright's port-availability check).
    // Migrations + seed run first so the demo user exists. The command inherits
    // DATABASE_ENGINE/DATABASE_URL from the environment, so e2e runs on the same
    // engine as the rest of the suite (SQLite by default).
    command:
      "pnpm exec varlock run -- prisma migrate deploy && " +
      "pnpm exec varlock run -- tsx apps/web/prisma/seed.ts && " +
      "pnpm exec varlock run -- tsx watch --max-old-space-size=512 apps/web/src/server/index.ts",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});

import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);

/** E2E runs against a production build (ENG-006, ADR-029): `pnpm build` first, then `pnpm test:e2e`. */
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  // Sign-in flows hash passwords against a Docker database alongside the app: give busy machines time.
  workers: process.env.CI ? 2 : 4,
  expect: { timeout: 10_000 },
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `pnpm start --port ${PORT}`,
    url: `http://localhost:${PORT}/api/health/`,
    // Never reuse a server: a stale build once made tests pass or fail against old code.
    reuseExistingServer: false,
    timeout: 60_000,
  },
});

import { defineConfig, devices } from "@playwright/test";
import { ACTION_LINK_TEST_SECRET } from "./tests/support/requests";
import { ensureFeedCertificate, FEED_PULL_TEST_SECRET, FEED_TEST_ORIGIN, FEED_TLS } from "./tests/support/feed-tls";
import { STRIPE_WEBHOOK_TEST_SECRET } from "./tests/support/stripe";

const PORT = Number(process.env.E2E_PORT ?? 3100);
ensureFeedCertificate();

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
    // The connections tests' local feed server (honoured only against the local database) and the scheduler's secret.
    env: {
      NILECRUZ_FEED_TEST_ORIGINS: FEED_TEST_ORIGIN,
      NILECRUZ_FEED_TEST_CA: FEED_TLS.cert,
      FEED_PULL_SECRET: FEED_PULL_TEST_SECRET,
      // No Stripe key in tests: card checkout says it's off, and tests sign webhooks themselves (no Stripe network).
      STRIPE_WEBHOOK_SECRET: STRIPE_WEBHOOK_TEST_SECRET,
      // Empty overrides a sandbox key in .env.local, so local runs match CI.
      STRIPE_SECRET_KEY: "",
      // ADR-099: booking-request links are signed with a test secret; no email or WhatsApp leaves the machine
      // (messages are recorded in outbound_messages as skipped).
      ACTION_LINK_SECRET: ACTION_LINK_TEST_SECRET,
      RESEND_API_KEY: "",
      WHATSAPP_ENABLED: "false",
      ADMIN_ALERT_EMAIL: "alerts@nilecruz.test",
      // SEC-006: every test runs from one address, so limits by address are off here; limits per account and per email
      // (failed sign-ins) stay on and are tested.
      RATE_LIMIT_ADDRESSES: "off",
    },
  },
});

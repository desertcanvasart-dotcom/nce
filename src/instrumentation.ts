/**
 * ENG-014 (Batch 11): server and edge errors go to Sentry, tagged with the release, once SENTRY_DSN is set (Railway
 * variables). Without it nothing loads and errors stay in the server log only. No personal data is sent.
 */
export async function register() {
  const dsn = process.env.SENTRY_DSN?.trim();
  if (!dsn) return;
  const Sentry = await import("@sentry/nextjs");
  Sentry.init({
    dsn,
    release: process.env.NEXT_PUBLIC_RELEASE,
    environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || "staging",
    // No personal data: no user, cookies, headers, request bodies or query strings.
    dataCollection: { userInfo: false, cookies: false, httpHeaders: false, httpBodies: [], urlQueryParams: false },
    tracesSampleRate: 0.1,
  });
}

/** Every server error Next.js sees (pages, actions, route handlers), reported when Sentry is on. */
export async function onRequestError(...args: Parameters<typeof import("@sentry/nextjs").captureRequestError>) {
  if (!process.env.SENTRY_DSN?.trim()) return;
  const { captureRequestError } = await import("@sentry/nextjs");
  captureRequestError(...args);
}

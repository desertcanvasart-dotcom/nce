/**
 * ENG-014, PERF-003 (Batch 11): browser errors and real visitors' Core Web Vitals (INP among them) go to Sentry once
 * NEXT_PUBLIC_SENTRY_DSN is set. The SDK is loaded on demand only then, so the pages carry no extra JavaScript while
 * it's off. No personal data is sent.
 */
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim();
if (dsn) {
  void import("@sentry/nextjs").then((Sentry) =>
    Sentry.init({
      dsn,
      release: process.env.NEXT_PUBLIC_RELEASE,
      environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || "staging",
      // No personal data: no user, cookies, headers, request bodies or query strings.
      dataCollection: { userInfo: false, cookies: false, httpHeaders: false, httpBodies: [], urlQueryParams: false },
      tracesSampleRate: 0.1,
      integrations: [Sentry.browserTracingIntegration()],
    }),
  );
}

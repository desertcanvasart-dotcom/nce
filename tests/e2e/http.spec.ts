import { expect, test } from "@playwright/test";

test("URLs without a trailing slash redirect to the slash form (SEO-001)", async ({ request }) => {
  const res = await request.get("/terms", { maxRedirects: 0 });
  expect(res.status()).toBe(308);
  expect(res.headers()["location"]).toBe("/terms/");
});

/**
 * SEO-021, SEO-022 (Batch 10-2): every address found on the live nilecruz.com (docs/imports/live-site-urls.md) 301s to
 * its new page (after the trailing-slash hop), and that page answers. Its sitemap, its links, the filter links, and the detail-page patterns it builds.
 */
const LIVE: [string, string][] = [
  ["/explore", "/cruises/"],
  ["/explore?boat=dahabiya", "/cruises/dahabiyas/?boat=dahabiya"],
  ["/explore?boat=powered", "/cruises/motor-ships/?boat=powered"],
  ["/explore?nights=4", "/cruises/?nights=4"],
  ["/explore?route=lake", "/cruises/?route=lake"],
  ["/how-we-score", "/how-we-choose-vessels/"],
  ["/independence", "/how-we-choose-vessels/"],
  ["/match", "/plan-my-cruise/"],
  ["/request", "/plan-my-cruise/"],
  ["/tours", "/tours-extras/"],
  ["/compare", "/cruises/compare/"],
  ["/account?login=customer", "/dashboard/?login=customer"],
  ["/tours/17100001-0000-4000-8000-000000000007", "/tours-extras/abu-simbel-day-trip/"],
  ["/tours/00000000-0000-4000-8000-0000000000ff", "/tours-extras/"],
  ["/cruise/00000000-0000-4000-8000-0000000000ff", "/cruises/"],
];

test("every live-site address 301s to its new page, which answers (SEO-021, SEO-022)", async ({ request }) => {
  for (const [from, to] of LIVE) {
    // Two hops: the trailing slash first (308, SEO-001), then the 301 to the new page.
    const [path, query] = from.split("?");
    const slashed = `${path}/${query ? `?${query}` : ""}`;
    const first = await request.get(from, { maxRedirects: 0 });
    expect(first.status(), from).toBe(308);
    expect(first.headers()["location"], from).toBe(slashed);
    const res = await request.get(slashed, { maxRedirects: 0 });
    expect(res.status(), slashed).toBe(301);
    expect(res.headers()["location"], slashed).toBe(to);
    // The new page loads (the dashboard sends visitors to sign in first).
    const end = await request.get(to);
    expect(end.status(), to).toBe(200);
  }
  // Pages with the same address keep it, with the trailing slash.
  for (const p of ["/privacy", "/terms", "/"]) expect((await request.get(p)).status()).toBe(200);
});

test("security headers are set (SEC-012)", async ({ request }) => {
  const h = (await request.get("/")).headers();
  expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(h["content-security-policy"]).toContain("object-src 'none'");
  expect(h["strict-transport-security"]).toContain("max-age=");
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(h["x-powered-by"]).toBeUndefined();
});

test("staging is never indexed: robots blocks all and X-Robots-Tag is set (SEO-020)", async ({ request }) => {
  expect(await (await request.get("/robots.txt")).text()).toContain("Disallow: /");
  expect((await request.get("/")).headers()["x-robots-tag"]).toBe("noindex, nofollow");
});

test("health check responds (Railway)", async ({ request }) => {
  expect(await (await request.get("/api/health/")).json()).toEqual({ ok: true });
});

test("no secret appears in client JavaScript (SEC-003)", async ({ page }) => {
  const bodies: string[] = [];
  page.on("response", async (r) => {
    if (r.url().endsWith(".js")) bodies.push(await r.text());
  });
  // "networkidle" never settles once nav links prefetch in the background; load plus a short wait collects every script.
  await page.goto("/", { waitUntil: "load" });
  await page.waitForTimeout(1500);
  const all = bodies.join("\n");
  expect(all).not.toMatch(/sb_secret_|service_role|SUPABASE_SECRET_KEY/);
});

test("the health path Railway checks answers 200 without a redirect (ENG-011)", async ({ request }) => {
  const res = await request.get("/api/health/", { maxRedirects: 0 });
  expect(res.status()).toBe(200);
});

test("plain-HTTP local servers are not upgraded to HTTPS (CSP)", async ({ request }) => {
  // The e2e server runs on http://localhost, so upgrade-insecure-requests must be absent here; HTTPS sites keep it.
  expect((await request.get("/")).headers()["content-security-policy"]).not.toContain("upgrade-insecure-requests");
});

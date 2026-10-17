import { expect, test } from "@playwright/test";

test("URLs without a trailing slash redirect to the slash form (SEO-001)", async ({ request }) => {
  const res = await request.get("/terms", { maxRedirects: 0 });
  expect(res.status()).toBe(308);
  expect(res.headers()["location"]).toBe("/terms/");
});

test("live-site URLs 301 to their silo equivalents (SEO-021)", async ({ request }) => {
  for (const [from, to] of [
    ["/explore/", "/cruises/"],
    ["/how-we-score/", "/how-we-choose-vessels/"],
    ["/independence/", "/how-we-choose-vessels/"],
  ]) {
    const res = await request.get(from!, { maxRedirects: 0 });
    expect(res.status()).toBe(301);
    expect(res.headers()["location"]).toBe(to);
  }
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
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  const all = bodies.join("\n");
  expect(all).not.toMatch(/sb_secret_|service_role|SUPABASE_SECRET_KEY/);
});

test("the health path Railway checks answers 200 without a redirect (ENG-011)", async ({ request }) => {
  const res = await request.get("/api/health/", { maxRedirects: 0 });
  expect(res.status()).toBe(200);
});

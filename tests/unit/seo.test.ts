import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/env", () => ({ siteUrl: "https://nilecruz.com", indexingAllowed: true }));
const { localizedPath, absoluteUrl, pageMetadata } = await import("@/lib/seo/metadata");
const { liveSiteRedirects } = await import("@/lib/redirects");

describe("localised paths (I18N-001, SEO-001)", () => {
  it.each([
    ["en", "/", "/"],
    ["en", "/terms", "/terms/"],
    ["en", "terms/", "/terms/"],
    ["es", "/", "/es/"],
    ["es", "/cruises", "/es/cruises/"],
    ["ja", "/nile-cruise-guide/routes", "/ja/nile-cruise-guide/routes/"],
  ] as const)("%s %s → %s", (locale, path, expected) => {
    expect(localizedPath(locale, path)).toBe(expected);
  });
});

describe("page metadata (SEO-002, SEO-006)", () => {
  it("sets a self-referencing absolute canonical", () => {
    expect(absoluteUrl("es", "/cruises")).toBe("https://nilecruz.com/es/cruises/");
    expect(pageMetadata({ locale: "en", path: "/terms", title: "Terms" }).alternates?.canonical).toBe(
      "https://nilecruz.com/terms/",
    );
  });
  it("respects noindex", () => {
    expect(pageMetadata({ locale: "en", path: "/terms", title: "Terms", noindex: true }).robots).toMatchObject({ index: false });
  });
});

describe("live-site redirects (SEO-021, ADR-028)", () => {
  it("send every live URL to a silo URL with a trailing slash", () => {
    for (const r of liveSiteRedirects) expect(r.destination).toMatch(/^\/[a-z0-9-/]+\/$/);
    expect(liveSiteRedirects.map((r) => r.source).sort()).toEqual(
      ["/account", "/compare", "/explore", "/how-we-score", "/independence", "/match", "/request", "/tours"].sort(),
    );
  });
});

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
    const pages = liveSiteRedirects.filter((r) => !r.has && !r.source.includes("/:id") && !r.source.startsWith("/tours/"));
    expect(pages.map((r) => r.source).sort()).toEqual(
      ["/account", "/compare", "/explore", "/how-we-score", "/independence", "/match", "/request", "/tours"].sort(),
    );
    // The live listing's filters go to the matching pages, before the plain /explore rule.
    const explore = liveSiteRedirects.filter((r) => r.source === "/explore").map((r) => r.destination);
    expect(explore).toEqual(["/cruises/dahabiyas/", "/cruises/motor-ships/", "/cruises/"]);
    // Any other live tour or vessel address, last.
    expect(liveSiteRedirects.slice(-2)).toEqual([
      { source: "/tours/:id", destination: "/tours-extras/" },
      { source: "/cruise/:id", destination: "/cruises/" },
    ]);
  });

  it("send each live tour page to its one new page (SEO-022)", () => {
    const tours = liveSiteRedirects.filter((r) => r.source.startsWith("/tours/") && !r.source.includes(":"));
    expect(tours).toHaveLength(7);
    expect(tours.find((r) => r.source.endsWith("0007"))?.destination).toBe("/tours-extras/abu-simbel-day-trip/");
    expect(tours.find((r) => r.source.endsWith("0003"))?.destination).toBe("/tours-extras/transfers/");
    expect(tours.find((r) => r.source.endsWith("0001"))?.destination).toBe("/tours-extras/4-night-sightseeing-luxor-to-aswan/");
  });
});

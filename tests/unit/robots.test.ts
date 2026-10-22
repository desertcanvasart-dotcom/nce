import { describe, expect, it, vi, beforeEach } from "vitest";

describe("robots.txt (SEO-020)", () => {
  beforeEach(() => vi.resetModules());

  it("blocks everything when indexing is not allowed (staging)", async () => {
    vi.doMock("@/lib/env", () => ({ indexingAllowed: false }));
    const { default: robots } = await import("@/app/robots");
    expect(robots().rules).toEqual([{ userAgent: "*", disallow: "/" }]);
  });

  it("disallows private areas in production", async () => {
    vi.doMock("@/lib/env", () => ({ indexingAllowed: true, siteUrl: "https://nilecruz.com" }));
    const { default: robots } = await import("@/app/robots");
    const rules = robots().rules as { disallow: string[] }[];
    expect(rules[0]!.disallow).toEqual(
      expect.arrayContaining(["/dashboard/", "/account/", "/api/", "/mcp", "/dev/", "/studio/"]),
    );
    // SEO-019: and points crawlers at the sitemap index.
    expect(robots().sitemap).toBe("https://nilecruz.com/sitemap.xml");
  });
});

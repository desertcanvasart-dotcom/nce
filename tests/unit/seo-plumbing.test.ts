import { describe, expect, it } from "vitest";
import { DRAFT_PAGES } from "@/content/pages";
import { routing } from "@/i18n/routing";
import { TOOLS } from "@/lib/mcp/tools";
import { articleJsonLd, organizationJsonLd } from "@/lib/seo/jsonld";
import { isBuilt } from "@/lib/seo/links";
import { llmsTxt } from "@/lib/seo/llms";
import { hreflangAlternates, pageMetadata } from "@/lib/seo/metadata";
import { indexablePaths, sitemapEntries } from "@/lib/seo/sitemap";
import { isTranslated, translatedLocales, TRANSLATED } from "@/lib/seo/translations";
import { internalLinks, jsonLdTypes } from "../support/crawl";

const list = { es: ["/about/"], ja: [] as string[] };
const origin = (u: string) => u.replace(/^https?:\/\/[^/]+/, "");

describe("Batch 10: which pages are translated", () => {
  it("English is always complete; other languages only when listed", () => {
    expect(isTranslated("/about", "en", list)).toBe(true);
    expect(isTranslated("/about", "es", list)).toBe(true);
    expect(isTranslated("about/", "es", list)).toBe(true);
    expect(isTranslated("/about/", "ja", list)).toBe(false);
    expect(translatedLocales("/contact/", list)).toEqual(["en"]);
  });
  it("translations arrive page by page: so far, the vessels pillar, the destinations hub and the guide hub (ADR-106, ADR-108, ADR-111)", () => {
    expect(TRANSLATED).toEqual({
      es: ["/vessels/", "/destinations/", "/nile-cruise-guide/"],
      ja: ["/vessels/", "/destinations/", "/nile-cruise-guide/"],
    });
  });
});

describe("SEO-007 hreflang", () => {
  it("lists each translated language and x-default, the same set from every language", () => {
    const set = hreflangAlternates("/about/", list);
    expect(Object.fromEntries(Object.entries(set).map(([k, v]) => [k, origin(v)]))).toEqual({
      en: "/about/",
      es: "/es/about/",
      "x-default": "/about/",
    });
  });
  it("an untranslated page is noindex and points its canonical at English", () => {
    const m = pageMetadata({ locale: "ja", path: "/about", title: "About" });
    expect(m.robots).toEqual({ index: false, follow: true });
    expect(origin(String(m.alternates?.canonical))).toBe("/about/");
    expect(m.alternates?.languages).toBeUndefined();
  });
});

describe("SEO-019 sitemaps", () => {
  it("lists built pages, published vessels and tours, never the comparison", () => {
    const paths = indexablePaths(["/cruises/sample-ship/"], ["/tours-extras/some-tour/"]);
    expect(paths).toContain("/about/");
    expect(paths).toContain("/operators/connect/");
    expect(paths).toContain("/cruises/sample-ship/");
    expect(paths).not.toContain("/cruises/compare/");
    expect(new Set(paths).size).toBe(paths.length);
  });
  it("each language lists only its translated pages, with their hreflang", () => {
    expect(sitemapEntries("es", ["/about/", "/contact/"], list).map((e) => origin(e.url))).toEqual(["/es/about/"]);
    expect(sitemapEntries("ja", ["/about/"], list)).toEqual([]);
    expect(Object.keys(sitemapEntries("en", ["/about/"], list)[0]!.alternates!.languages!)).toEqual(["en", "es", "x-default"]);
  });
});

describe("the crawler's reading of a page", () => {
  it("finds JSON-LD types, nested ones too, and whether a price is stated", () => {
    const html = `<script type="application/ld+json">{"@type":"TouristTrip","offers":{"@type":"Offer","price":"10"}}</script>`;
    expect(jsonLdTypes(html)).toEqual({ types: ["Offer", "TouristTrip"], valid: true, priced: true });
    expect(jsonLdTypes(`<script type="application/ld+json">{oops</script>`).valid).toBe(false);
  });
  it("keeps internal links and leaves out the language switch's", () => {
    const html = `<a href="/es/about/?x=1#y">a</a><a href="https://x.test/">b</a><a href="/about/" hrefLang="en">EN</a><a href="//cdn">c</a>`;
    expect(internalLinks(html)).toEqual(["/es/about/"]);
  });
});

describe("what crawlers and assistants are told", () => {
  it("a thin list page stays out of search but its links are followed; a private page's are not", () => {
    expect(pageMetadata({ locale: "en", path: "/blog", title: "Blog", noindex: true, follow: true }).robots).toEqual({
      index: false,
      follow: true,
    });
    expect(pageMetadata({ locale: "en", path: "/terms", title: "Terms", noindex: true }).robots).toEqual({
      index: false,
      follow: false,
    });
  });
  it("the proxy sends no hreflang header of its own: the pages' tags are the only source (SEO-007)", () => {
    expect(routing.alternateLinks).toBe(false);
  });
  it("sitemap entries carry the date a page last changed, where one is known (SEO-019)", () => {
    const entries = sitemapEntries("en", ["/about/", "/cruises/some-ship/"], list, {
      "/cruises/some-ship/": "2026-11-06T10:00:00Z",
    });
    expect(entries[0]!.lastModified).toBeUndefined();
    expect(entries[1]!.lastModified).toBe("2026-11-06T10:00:00Z");
  });
  it("an article names its publisher with a logo, its language, a picture, and its date only when known", () => {
    const page = { ...DRAFT_PAGES.P027!, updatedAt: undefined };
    const ld = articleJsonLd(page, "https://x.test/a/", "es");
    expect(ld.inLanguage).toBe("es");
    expect(ld.publisher.logo.url).toMatch(/\/nilecruz-icon\.svg$/);
    expect(ld.author).toEqual(ld.publisher);
    expect(ld.image).toMatch(/\/nilecruz-social-share\.png$/);
    expect(ld.dateModified).toBeUndefined();
    expect(articleJsonLd({ ...page, updatedAt: "2026-11-01T08:00:00Z" }, "u").dateModified).toBe("2026-11-01T08:00:00Z");
    expect(organizationJsonLd("https://x.test")).toMatchObject({
      "@type": "Organization",
      url: "https://x.test/",
      logo: { "@type": "ImageObject", url: "https://x.test/nilecruz-icon.svg" },
    });
  });
  it("llms.txt lists only built pages, with absolute links, and the read-only MCP address", () => {
    const txt = llmsTxt("https://x.test");
    expect(txt.startsWith("# Nilecruz\n")).toBe(true);
    const links = [...txt.matchAll(/\]\((https:\/\/x\.test)(\/[^)]*)\)/g)].map((m) => m[2]!);
    expect(links.length).toBeGreaterThan(10);
    for (const l of links.filter((l) => l !== "/sitemap.xml")) expect(isBuilt(l), l).toBe(true);
    expect(txt).toContain("https://x.test/api/mcp/");
    for (const t of TOOLS) expect(txt).toContain(t.name);
  });
});

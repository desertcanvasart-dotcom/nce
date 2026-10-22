import { describe, expect, it } from "vitest";
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
  it("no page is marked translated yet: translations arrive page by page", () => {
    expect(TRANSLATED).toEqual({ es: [], ja: [] });
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

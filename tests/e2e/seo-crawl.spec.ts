import { expect, test } from "@playwright/test";
import { BUILT, LINK_MAP } from "@/lib/seo/links";
import { EXTRA_PAGES, NOT_IN_SITEMAP } from "@/lib/seo/sitemap";
import { crawl, type CrawledPage } from "../support/crawl";

test.describe.configure({ timeout: 300_000 });

/**
 * Batch 10 exit criterion: crawling from home finds every built page within three clicks, each with one H1 and the
 * structured data its silo row lists (SEO-003, 005, 017, 018); in Spanish and Japanese, links stay in the language
 * (I18N-003).
 */
const PAGES = [...BUILT, ...EXTRA_PAGES].filter((p) => !NOT_IN_SITEMAP.has(p));

async function site(request: import("@playwright/test").APIRequestContext, start: string) {
  return crawl(async (path) => {
    const r = await request.get(path, { maxRedirects: 0, failOnStatusCode: false });
    return { status: r.status(), html: r.status() === 200 ? await r.text() : "" };
  }, start);
}

test("from home: no orphans, three clicks and three folders at most, one H1, valid schema per silo row [SEO-003, 005, 017, 018]", async ({
  request,
}) => {
  const pages = await site(request, "/");
  const at = (p: string) => pages.get(p);
  expect(
    PAGES.filter((p) => !at(p)),
    "built pages the crawl can't reach (orphans)",
  ).toEqual([]);
  expect(PAGES.filter((p) => at(p)!.status !== 200).map((p) => `${p}: ${at(p)!.status}`)).toEqual([]);
  expect(PAGES.filter((p) => at(p)!.depth > 3).map((p) => `${p}: ${at(p)!.depth} clicks`)).toEqual([]);
  expect(PAGES.filter((p) => p.split("/").filter(Boolean).length > 3)).toEqual([]);
  const ok = [...pages.values()].filter((p) => p.status === 200);
  expect(ok.filter((p) => p.h1 !== 1).map((p) => `${p.path}: ${p.h1} H1s`)).toEqual([]);
  expect(ok.filter((p) => !p.jsonValid).map((p) => p.path)).toEqual([]);
  // The first word of each workbook schema entry is the type; "Offer" only where a price is stated.
  const missing = (p: string, c: CrawledPage) =>
    (LINK_MAP[p]?.schema ?? []).map((s) => s.split(" ")[0]!).filter((t) => !c.types.includes(t) && !(t === "Offer" && !c.priced));
  expect(PAGES.filter((p) => missing(p, at(p)!).length).map((p) => `${p}: ${missing(p, at(p)!).join(", ")}`)).toEqual([]);
});

for (const locale of ["es", "ja"] as const) {
  test(`in ${locale === "es" ? "Spanish" : "Japanese"}, every internal link stays in the language [I18N-003, DASH-BND-006]`, async ({
    request,
  }) => {
    const pages = await site(request, `/${locale}/`);
    for (const p of PAGES) expect(pages.has(`/${locale}${p}`), `/${locale}${p} reached`).toBe(true);
    const out = [...pages.values()].flatMap((p) =>
      p.links.filter((l) => !l.startsWith(`/${locale}/`)).map((l) => `${p.path} → ${l}`),
    );
    expect(out).toEqual([]);
  });
}

test("an untranslated page says so, isn't indexed and points at English; the switch links straight to each language [I18N-004, SEO-007]", async ({
  page,
}) => {
  await page.goto("/es/about/");
  await expect(page.getByText("Esta página aún no está traducida, así que la mostramos en inglés.")).toBeVisible();
  await expect(page.locator("main")).toHaveAttribute("lang", "en");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/about\/$/);
  await expect(page.locator('link[rel="canonical"]')).not.toHaveAttribute("href", /\/es\//);
  const sw = page.getByRole("list", { name: "Idioma" }).first();
  await expect(sw.getByRole("link", { name: "EN" })).toHaveAttribute("href", "/about/");
  await expect(sw.getByRole("link", { name: "日本語" })).toHaveAttribute("href", "/ja/about/");
  await page.goto("/about/");
  await expect(page.getByText(/isn’t translated yet/)).toHaveCount(0);
  await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveAttribute("href", /\/about\/$/);
});

test("the sitemaps: an index, one per language, only translated and indexable pages [SEO-019]", async ({ request }) => {
  const index = await (await request.get("/sitemap.xml")).text();
  for (const l of ["en", "es", "ja"]) expect(index).toContain(`/sitemaps/sitemap/${l}.xml</loc>`);
  const en = await (await request.get("/sitemaps/sitemap/en.xml")).text();
  expect(en).toMatch(/<loc>[^<]*\/about\/<\/loc>/);
  expect(en).toMatch(/<loc>[^<]*\/operators\/connect\/<\/loc>/);
  expect(en).not.toContain("/cruises/compare/");
  expect(en).not.toContain("/dashboard/");
  expect(en).toContain('hreflang="x-default"');
  const es = await (await request.get("/sitemaps/sitemap/es.xml")).text();
  expect(es).not.toContain("<url>");
});

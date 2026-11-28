import { routing, type Locale } from "@/i18n/routing";

type Other = Exclude<Locale, "en">;

/**
 * I18N-005, SEO-007 (Batch 10): the pages whose whole content is translated and reviewed, by language. English is
 * always complete. Add a page here, by its unprefixed path, in the same change that brings its approved translation:
 * it then becomes indexable in that language and joins hreflang and that language's sitemap. Until then the page is
 * shown in English with a note, `noindex`, with its canonical pointing at the English page.
 */
// The vessels pillar (ADR-106), the destinations hub and the guide hub (Islam's briefs, 4 Nov 2026): drafted in
// Spanish and Japanese, to be reviewed by native speakers.
const PILLARS = ["/vessels/", "/destinations/", "/nile-cruise-guide/"];

/**
 * Japanese (28 Nov 2026): every public page whose text is in the repository, drafted for native review. Privacy and terms
 * are English only (ADR-031).
 */
const JA_PAGES = [
  "/cruises/",
  "/cruises/dahabiyas/",
  "/cruises/motor-ships/",
  "/cruises/luxury/",
  "/cruises/luxor-to-aswan/",
  "/cruises/aswan-to-luxor/",
  "/cruises/compare/",
  "/",
  "/vessels/dahabiya/",
  "/vessels/dahabiya/a-day-on-board/",
  "/vessels/motor-cruise-ships/",
  "/vessels/motor-cruise-ships/a-day-on-board/",
  "/vessels/paddle-steamers/",
  "/vessels/compare/",
  "/vessels/compare/dahabiya-vs-cruise-ship/",
  "/nile-cruise-prices/",
  "/nile-cruise-prices/star-ratings-explained/",
  "/nile-cruise-prices/whats-included/",
  "/nile-cruise-prices/budget-vs-luxury/",
  "/nile-cruise-prices/price-calculator/",
  "/nile-cruise-guide/routes/",
  "/nile-cruise-guide/routes/luxor-to-aswan/",
  "/nile-cruise-guide/routes/aswan-to-luxor/",
  "/nile-cruise-guide/routes/esna-to-aswan/",
  "/nile-cruise-guide/when-to-go/",
  "/nile-cruise-guide/planning/",
  "/nile-cruise-guide/planning/how-many-nights/",
  "/nile-cruise-guide/planning/nile-cruise-vs-land-tour/",
  "/nile-cruise-guide/planning/tipping/",
  "/destinations/luxor/",
  "/destinations/edfu/",
  "/destinations/kom-ombo/",
  "/destinations/aswan/",
  "/destinations/abu-simbel/",
  "/tours-extras/",
  "/tours-extras/abu-simbel-day-trip/",
  "/tours-extras/luxor-hot-air-balloon/",
  "/tours-extras/transfers/",
  "/about/",
  "/how-we-choose-vessels/",
  "/contact/",
  "/plan-my-cruise/",
  "/operators/connect/",
  "/account/sign-in/",
  "/account/sign-up/",
  "/account/reset-password/",
];

/**
 * The blog, and the posts that have a Japanese version in Sanity (ADR-105). A new post joins when its Japanese is
 * published; so does a topic when its first post has one.
 */
const JA_BLOG = ["/blog/", "/blog/topics/news/", "/blog/nour-el-nil-dahabiyas-join-nilecruz/"];

/**
 * Vessel pages whose database text is complete in Japanese (all 27 on production, 28 Nov 2026). A new vessel joins when
 * its Japanese rows are in.
 */
const JA_VESSELS = [
  "movenpick-darakum",
  "movenpick-hamees",
  "movenpick-prince-abbas",
  "movenpick-royal-lily",
  "movenpick-royal-lotus",
  "movenpick-sb-feddya",
  "movenpick-ss-misr",
  "movenpick-sun-ray",
  "nour-el-nil-adelaide",
  "nour-el-nil-agatha",
  "nour-el-nil-dendera",
  "nour-el-nil-el-nil",
  "nour-el-nil-malouka",
  "nour-el-nil-meroe",
  "nour-el-nil-najafa",
  "nour-el-nil-poppee",
  "nour-el-nil-roman",
  "oberoi-philae",
  "oberoi-zahra",
  "sonesta-dahabeya-amirat",
  "sonesta-dahabeya-amirat-ii",
  "sonesta-moon-goddess",
  "sonesta-nile-goddess",
  "sonesta-st-george-i",
  "sonesta-star-goddess",
  "sonesta-sun-goddess",
  "steam-ship-sudan",
];

/** The vessel's own forms (ask, reserve, save a quote) hold interface text only, so they are translated for every vessel. */
const JA_FORMS = /^\/cruises\/[^/]+\/(ask|reserve|save-quote)\/$/;

export const TRANSLATED: Record<Other, readonly string[]> = {
  es: PILLARS,
  ja: [...PILLARS, ...JA_PAGES, ...JA_BLOG, ...JA_VESSELS.map((slug) => `/cruises/${slug}/`)],
};

const norm = (path: string) => {
  const clean = `/${path.replace(/^\/+|\/+$/g, "")}`;
  return clean === "/" ? "/" : `${clean}/`;
};

export function isTranslated(path: string, locale: Locale, list: Record<Other, readonly string[]> = TRANSLATED): boolean {
  if (locale === "en") return true;
  const clean = norm(path);
  return (list[locale as Other] ?? []).includes(clean) || (list === TRANSLATED && locale === "ja" && JA_FORMS.test(clean));
}

/** The languages a page is complete in, English first. */
export function translatedLocales(path: string, list: Record<Other, readonly string[]> = TRANSLATED): Locale[] {
  return routing.locales.filter((l) => isTranslated(path, l, list));
}

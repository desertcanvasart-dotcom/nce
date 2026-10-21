import { routing, type Locale } from "@/i18n/routing";

type Other = Exclude<Locale, "en">;

/**
 * I18N-005, SEO-007 (Batch 10): the pages whose whole content is translated and reviewed, by language. English is
 * always complete. Add a page here, by its unprefixed path, in the same change that brings its approved translation:
 * it then becomes indexable in that language and joins hreflang and that language's sitemap. Until then the page is
 * shown in English with a note, `noindex`, with its canonical pointing at the English page.
 */
export const TRANSLATED: Record<Other, readonly string[]> = {
  es: [],
  ja: [],
};

const norm = (path: string) => {
  const clean = `/${path.replace(/^\/+|\/+$/g, "")}`;
  return clean === "/" ? "/" : `${clean}/`;
};

export function isTranslated(path: string, locale: Locale, list: Record<Other, readonly string[]> = TRANSLATED): boolean {
  return locale === "en" || (list[locale as Other] ?? []).includes(norm(path));
}

/** The languages a page is complete in, English first. */
export function translatedLocales(path: string, list: Record<Other, readonly string[]> = TRANSLATED): Locale[] {
  return routing.locales.filter((l) => isTranslated(path, l, list));
}

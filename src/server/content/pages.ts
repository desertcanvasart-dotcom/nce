import "server-only";
import { unstable_cache } from "next/cache";
import { DRAFT_PAGES } from "@/content/pages";
import { DRAFT_PAGES_JA } from "@/content/pages/ja";
import type { Locale } from "@/i18n/routing";
import { blockText as text, toSections, type Block, type EditorialPage } from "@/lib/content/editorial";
import { CATALOGUE_SECONDS } from "@/server/marketplace/queries";
import { ContentNotConfiguredError, fetchContent } from "./client";

/**
 * Editorial pages (Batch 6, ADR-096). Sanity is the source: an `article` whose `pageId` is the workbook row. Where
 * Sanity isn't configured (CI, Lighthouse builds), or a page isn't in Sanity yet, the drafted copy in the repository is
 * used. Cached under the "content" tag (the signed refresh route expires it) and refreshed every ten minutes.
 */
export const CONTENT_TAG = "content";

type SanityArticle = {
  pageId: string;
  title: string;
  standfirst: string;
  upAnchor?: string;
  body?: Block[];
  faqs?: { question: string; answer?: Block[] }[];
  seoTitle?: string;
  seoDescription?: string;
  sample?: boolean;
  reviewStatus?: "draft" | "approved";
};

/**
 * Japanese: a Japanese article in Sanity, else the Japanese draft in the repository, else English. Spanish pages show
 * English until their translation arrives.
 */
async function loadPage(id: string, locale: Locale = "en"): Promise<EditorialPage | null> {
  const language = locale === "ja" ? "ja" : "en";
  try {
    const a = await fetchContent<SanityArticle | null>(
      `*[_type == "article" && pageId == $id && language == $language][0]{pageId, title, standfirst, upAnchor, body, faqs[]{question, answer}, seoTitle, seoDescription, sample, reviewStatus}`,
      { id, language },
    );
    if (a)
      return {
        id: a.pageId,
        title: a.title,
        standfirst: a.standfirst,
        upAnchor: a.upAnchor,
        sections: toSections(a.body),
        faqs: (a.faqs ?? []).map((f) => ({ q: f.question, a: (f.answer ?? []).map(text).join("\n\n") })),
        seoTitle: a.seoTitle,
        seoDescription: a.seoDescription,
        sample: a.sample ?? false,
        review: a.reviewStatus ?? "draft",
      };
  } catch (e) {
    if (!(e instanceof ContentNotConfiguredError)) throw e;
  }
  if (language === "ja") return DRAFT_PAGES_JA[id] ?? loadPage(id);
  return DRAFT_PAGES[id] ?? null;
}

export const editorialPage = unstable_cache(loadPage, ["editorial-page-v2"], {
  tags: [CONTENT_TAG],
  revalidate: CATALOGUE_SECONDS,
});

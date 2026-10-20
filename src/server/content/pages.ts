import "server-only";
import { createClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";
import { DRAFT_PAGES } from "@/content/pages";
import type { TypeStats } from "@/content/vessel-types";
import type { VesselType } from "@/components/ds/lib/types";
import { env } from "@/lib/env";
import { blockText as text, toSections, type Block, type EditorialPage } from "@/lib/content/editorial";
import type { Database } from "@/server/db/database.types";
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

async function loadPage(id: string): Promise<EditorialPage | null> {
  try {
    const a = await fetchContent<SanityArticle | null>(
      `*[_type == "article" && pageId == $id && language == "en"][0]{pageId, title, standfirst, upAnchor, body, faqs[]{question, answer}, seoTitle, seoDescription, sample, reviewStatus}`,
      { id },
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
  return DRAFT_PAGES[id] ?? null;
}

export const editorialPage = unstable_cache(loadPage, ["editorial-page-v1"], {
  tags: [CONTENT_TAG],
  revalidate: CATALOGUE_SECONDS,
});

/** DATA-009: guests and cabins per vessel type, from the catalogue (the middle half of each type). */
async function loadTypeStats(): Promise<Partial<Record<VesselType, TypeStats>>> {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return {};
  const db = createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await db.rpc("vessel_type_stats");
  if (error) throw error;
  return Object.fromEntries(
    (data ?? []).map((r) => [
      r.type,
      {
        vessels: r.vessels,
        guests: r.guests_low === null || r.guests_high === null ? null : [r.guests_low, r.guests_high],
        cabins: r.cabins_low === null || r.cabins_high === null ? null : [r.cabins_low, r.cabins_high],
      },
    ]),
  );
}

export const vesselTypeStats = unstable_cache(loadTypeStats, ["vessel-type-stats-v1"], {
  tags: ["catalogue"],
  revalidate: CATALOGUE_SECONDS,
});

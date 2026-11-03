import "server-only";
import { unstable_cache } from "next/cache";
import type { VesselType } from "@/components/ds/lib/types";
import type { Locale } from "@/i18n/routing";
import { isBlogTopic, latestFirst, type BlogPost } from "@/lib/content/blog";
import { blockText as text, toSections, type Block } from "@/lib/content/editorial";
import { CATALOGUE_SECONDS } from "@/server/marketplace/queries";
import { ContentNotConfiguredError, fetchContent } from "./client";
import { CONTENT_TAG } from "./pages";

/**
 * Blog posts (ADR-105): approved `post` documents in Sanity, newest first. A language without its own version of a
 * post gets the English one. Without Sanity (CI, Lighthouse builds) there are no posts. Cached under the "content" tag,
 * like the editorial pages, so a publish shows at once.
 */
type SanityPost = {
  slug: string;
  language: string;
  title: string;
  standfirst: string;
  topic: string;
  body?: Block[];
  faqs?: { question: string; answer?: Block[] }[];
  guidePage: string;
  vesselTypes?: VesselType[];
  author?: string;
  reviewer?: string;
  publishedAt: string;
  updatedAt?: string;
  sample?: boolean;
  seoTitle?: string;
  seoDescription?: string;
};

const QUERY = `*[_type == "post" && language in [$locale, "en"] && reviewStatus == "approved" && defined(slug.current) && defined(publishedAt)]{
  "slug": slug.current, language, title, standfirst, topic, body, faqs[]{question, answer}, guidePage, vesselTypes,
  author, "reviewer": reviewedBy->name, publishedAt, updatedAt, sample, seoTitle, seoDescription
}`;

async function load(locale: Locale): Promise<BlogPost[]> {
  let rows: SanityPost[];
  try {
    rows = await fetchContent<SanityPost[]>(QUERY, { locale });
  } catch (e) {
    if (e instanceof ContentNotConfiguredError) return [];
    throw e;
  }
  const bySlug = new Map<string, SanityPost>();
  for (const r of rows) if (r.language === locale || !bySlug.has(r.slug)) bySlug.set(r.slug, r);
  return latestFirst(
    [...bySlug.values()]
      .filter((r) => isBlogTopic(r.topic))
      .map((r) => ({
        slug: r.slug,
        language: r.language,
        title: r.title,
        standfirst: r.standfirst,
        topic: r.topic as BlogPost["topic"],
        sections: toSections(r.body),
        faqs: (r.faqs ?? []).map((f) => ({ q: f.question, a: (f.answer ?? []).map(text).join("\n\n") })),
        guidePage: r.guidePage,
        vesselTypes: r.vesselTypes ?? [],
        author: r.author || undefined,
        reviewer: r.reviewer || undefined,
        publishedAt: r.publishedAt,
        updatedAt: r.updatedAt || undefined,
        sample: r.sample ?? false,
        seoTitle: r.seoTitle || undefined,
        seoDescription: r.seoDescription || undefined,
      })),
  );
}

export const blogPosts = unstable_cache(load, ["blog-posts-v1"], { tags: [CONTENT_TAG], revalidate: CATALOGUE_SECONDS });

/** For the footer link on every page: a Sanity outage hides the link rather than breaking the page. */
export async function blogHasPosts(locale: Locale): Promise<boolean> {
  try {
    return (await blogPosts(locale)).length > 0;
  } catch (e) {
    console.error("Blog posts could not be loaded for the footer", e);
    return false;
  }
}

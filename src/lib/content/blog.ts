/**
 * The blog (ADR-105): dated posts at /blog/{slug}/, written in Sanity (`post`). Evergreen advice stays in the guide;
 * each post links up to one guide page. Pure helpers here; src/server/content/posts.ts reads Sanity.
 */
import type { SceneTime, VesselType } from "@/components/ds/lib/types";
import type { EditorialSection } from "./editorial";

export const BLOG_URL = "/blog/";

/** Keep in step with TOPICS in studio/schemaTypes/documents/post.ts. */
export const BLOG_TOPICS = {
  news: { label: "News", time: "day" },
  seasons: { label: "Seasons", time: "dusk" },
  vessels: { label: "Vessels", time: "dawn" },
  egyptology: { label: "Egyptology", time: "day" },
  "trip-stories": { label: "Trip stories", time: "dusk" },
} as const satisfies Record<string, { label: string; time: SceneTime }>;

export type BlogTopic = keyof typeof BLOG_TOPICS;

export const isBlogTopic = (s: string): s is BlogTopic => Object.hasOwn(BLOG_TOPICS, s);

/** The index and each topic page are indexed once they hold this many real (not sample) posts. */
export const MIN_POSTS_TO_INDEX = 3;

export type BlogPost = {
  slug: string;
  /** The language the text is in: a Spanish or Japanese page shows English until its translation is published. */
  language: string;
  title: string;
  standfirst: string;
  topic: BlogTopic;
  sections: EditorialSection[];
  faqs: { q: string; a: string }[];
  /** The guide page the post links up to (unprefixed, with its trailing slash). */
  guidePage: string;
  vesselTypes: VesselType[];
  /** Shown as the byline; "Nilecruz" when empty. */
  author?: string;
  /** The Egyptologist who checked it. */
  reviewer?: string;
  publishedAt: string;
  updatedAt?: string;
  sample: boolean;
  seoTitle?: string;
  seoDescription?: string;
};

export const postUrl = (slug: string) => `${BLOG_URL}${slug}/`;
export const topicUrl = (topic: BlogTopic) => `${BLOG_URL}topics/${topic}/`;

/** Newest first. */
export const latestFirst = (posts: BlogPost[]) => [...posts].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

/** "3 November 2026", on Cairo's calendar. */
export const postDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Cairo" });

/** The date as the <time> element's machine-readable value (Cairo's calendar day). */
export const postDay = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: "Africa/Cairo" });

/** Whether a list page (the index or a topic) has enough real posts to be indexed. */
export const listIndexable = (posts: BlogPost[]) => posts.filter((p) => !p.sample).length >= MIN_POSTS_TO_INDEX;

/** SEO-019: the blog's sitemap paths: every real post, and the index and topics once they're indexable. */
export function blogPaths(posts: BlogPost[]): string[] {
  const out = posts.filter((p) => !p.sample).map((p) => postUrl(p.slug));
  if (listIndexable(posts)) out.push(BLOG_URL);
  for (const t of Object.keys(BLOG_TOPICS) as BlogTopic[])
    if (listIndexable(posts.filter((p) => p.topic === t))) out.push(topicUrl(t));
  return out;
}

/** Up to `n` other posts, the same topic first, newest first. */
export function morePosts(post: BlogPost, posts: BlogPost[], n = 3): BlogPost[] {
  const others = latestFirst(posts.filter((p) => p.slug !== post.slug));
  return [...others.filter((p) => p.topic === post.topic), ...others.filter((p) => p.topic !== post.topic)].slice(0, n);
}

import { describe, expect, it } from "vitest";
import { blogPaths, latestFirst, listIndexable, morePosts, postDate, postDay, type BlogPost } from "@/lib/content/blog";
import { blogPostingJsonLd } from "@/lib/seo/jsonld";
import { indexablePaths } from "@/lib/seo/sitemap";

const post = (slug: string, over: Partial<BlogPost> = {}): BlogPost => ({
  slug,
  language: "en",
  title: `Post ${slug}`,
  standfirst: "What happened.",
  topic: "news",
  sections: [],
  faqs: [],
  guidePage: "/nile-cruise-guide/when-to-go/",
  vesselTypes: [],
  publishedAt: "2026-11-01T08:00:00Z",
  sample: false,
  ...over,
});

describe("ADR-105 blog", () => {
  it("lists posts newest first", () => {
    const posts = [post("a", { publishedAt: "2026-10-01T00:00:00Z" }), post("b", { publishedAt: "2026-11-01T00:00:00Z" })];
    expect(latestFirst(posts).map((p) => p.slug)).toEqual(["b", "a"]);
  });

  it("dates posts on Cairo's calendar", () => {
    // 23:30 UTC on 2 November is already 3 November in Cairo.
    expect(postDate("2026-11-02T23:30:00Z")).toBe("3 November 2026");
    expect(postDay("2026-11-02T23:30:00Z")).toBe("2026-11-03");
  });

  it("indexes the index and a topic only once they hold three real posts", () => {
    const two = [post("a"), post("b"), post("c", { sample: true })];
    expect(listIndexable(two)).toBe(false);
    expect(blogPaths(two)).toEqual(["/blog/a/", "/blog/b/"]);
    const three = [...two, post("d", { topic: "seasons" })];
    expect(listIndexable(three)).toBe(true);
    // The index joins; "news" still has two real posts, so its topic page doesn't.
    expect(blogPaths(three)).toEqual(["/blog/a/", "/blog/b/", "/blog/d/", "/blog/"]);
    expect(blogPaths([...three, post("e")])).toContain("/blog/topics/news/");
  });

  it("puts the blog's pages in the sitemap set, never sample posts", () => {
    const paths = indexablePaths([], [], blogPaths([post("a"), post("b", { sample: true })]));
    expect(paths).toContain("/blog/a/");
    expect(paths).not.toContain("/blog/b/");
    expect(paths).not.toContain("/blog/");
  });

  it("suggests other posts, the same topic first", () => {
    const me = post("me");
    const posts = [
      me,
      post("old-news", { publishedAt: "2026-09-01T00:00:00Z" }),
      post("season", { topic: "seasons", publishedAt: "2026-11-02T00:00:00Z" }),
      post("new-news", { publishedAt: "2026-10-01T00:00:00Z" }),
    ];
    expect(morePosts(me, posts).map((p) => p.slug)).toEqual(["new-news", "old-news", "season"]);
    expect(morePosts(me, posts, 1)).toHaveLength(1);
  });

  it("describes a post as BlogPosting with its dates, byline and language", () => {
    const ld = blogPostingJsonLd(
      post("a", { updatedAt: "2026-11-03T00:00:00Z", author: "Mona Saleh", language: "es" }),
      "https://nilecruz.com/es/blog/a/",
      "https://nilecruz.com/es/blog/",
    );
    expect(ld).toMatchObject({
      "@type": "BlogPosting",
      headline: "Post a",
      datePublished: "2026-11-01T08:00:00Z",
      dateModified: "2026-11-03T00:00:00Z",
      author: { "@type": "Person", name: "Mona Saleh" },
      articleSection: "News",
      inLanguage: "es",
    });
    expect(blogPostingJsonLd(post("b"), "u", "b")).toMatchObject({
      dateModified: "2026-11-01T08:00:00Z",
      author: { "@type": "Organization", name: "Nilecruz" },
    });
  });
});

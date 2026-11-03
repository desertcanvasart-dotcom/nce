import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { ClosingCruises } from "@/components/editorial/ClosingCruises";
import { LinkCards } from "@/components/editorial/LinkCards";
import { MorePosts, PostMeta, PostScene } from "@/components/editorial/PostList";
import { Breadcrumbs } from "@/components/marketplace/Breadcrumbs";
import styles from "@/components/editorial/editorial.module.css";
import blog from "@/components/editorial/blog.module.css";
import { routing, type Locale } from "@/i18n/routing";
import { BLOG_URL, morePosts, postDate, postDay, postUrl, type BlogPost } from "@/lib/content/blog";
import { jsonLdScript } from "@/lib/marketplace/listing";
import { blogPostingJsonLd, faqJsonLd } from "@/lib/seo/jsonld";
import { closingListing, isBuilt, LINK_MAP, sentence, type Link } from "@/lib/seo/links";
import { absoluteUrl, pageMetadata } from "@/lib/seo/metadata";
import { blogPosts } from "@/server/content/posts";
import { publicListing } from "@/server/marketplace/queries";

type Props = { params: Promise<{ locale: Locale; slug: string }> };

// Static, refreshed when content is published, or every ten minutes; new posts render on first visit (PERF-010).
export const revalidate = 600;
export const dynamicParams = true;

export async function generateStaticParams() {
  const posts = await blogPosts(routing.defaultLocale);
  return routing.locales.flatMap((locale) => posts.map((p) => ({ locale, slug: p.slug })));
}

async function find(locale: Locale, slug: string) {
  const posts = await blogPosts(locale);
  return { post: posts.find((p) => p.slug === slug), posts };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const { post } = await find(locale, slug);
  if (!post) return {};
  const meta = pageMetadata({
    locale,
    path: postUrl(post.slug),
    title: post.seoTitle ?? post.title,
    description: post.seoDescription ?? post.standfirst,
    noindex: post.sample,
  });
  return {
    ...meta,
    openGraph: {
      ...meta.openGraph,
      type: "article",
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt ?? post.publishedAt,
    },
  };
}

/** The guide page a post links up to; the guide's pillar when that page isn't built. */
function guideLink(post: BlogPost): Link {
  const href = LINK_MAP[post.guidePage] && isBuilt(post.guidePage) ? post.guidePage : "/nile-cruise-guide/";
  return { href, anchor: sentence(LINK_MAP[href]!.keyword) };
}

/**
 * ADR-105: a blog post. Topic and date, title, standfirst and byline; the scene until photos (ADR-096); the text; the
 * guide page it leads to; more posts; questions; cruises; BlogPosting and FAQPage data.
 */
export default async function BlogPostPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const [{ post, posts }, all] = await Promise.all([find(locale, slug), publicListing()]);
  if (!post) notFound();
  const url = postUrl(post.slug);
  const guide = guideLink(post);
  const faq = faqJsonLd(post);
  const updated = post.updatedAt && postDay(post.updatedAt) !== postDay(post.publishedAt) ? post.updatedAt : null;
  return (
    <article className={styles.page}>
      <Breadcrumbs
        locale={locale}
        trail={[
          { name: "Home", path: "/" },
          { name: "Blog", path: BLOG_URL },
          { name: post.title, path: url },
        ]}
      />
      <header className={styles.head}>
        <PostMeta post={post} linkTopic />
        <h1 className={styles.title}>{post.title}</h1>
        <p className={styles.lead}>{post.standfirst}</p>
        <p className={blog.byline}>
          By {post.author ?? "Nilecruz"}
          {post.reviewer ? `. Checked by ${post.reviewer}` : null}
          {updated ? (
            <>
              . Updated <time dateTime={postDay(updated)}>{postDate(updated)}</time>
            </>
          ) : null}
          .
        </p>
      </header>
      <PostScene post={post} />
      {post.sections.map((s, i) => (
        <section key={i} className={styles.section}>
          {s.heading ? <h2>{s.heading}</h2> : null}
          {s.paragraphs.map((p, j) => (
            <p key={j}>{p}</p>
          ))}
        </section>
      ))}
      <LinkCards title="Read more in the guide" links={[guide]} id="in-the-guide" />
      {post.faqs.length ? (
        <section className={styles.section} aria-labelledby="faqs">
          <h2 id="faqs">Questions</h2>
          <dl className={styles.faqs}>
            {post.faqs.map((f) => (
              <div key={f.q}>
                <dt>{f.q}</dt>
                <dd>{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}
      <MorePosts posts={morePosts(post, posts)} />
      <ClosingCruises all={all} listing={closingListing(guide.href)} type={post.vesselTypes[0]} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(blogPostingJsonLd(post, absoluteUrl(locale, url), absoluteUrl(locale, BLOG_URL))),
        }}
      />
      {faq ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(faq) }} /> : null}
    </article>
  );
}

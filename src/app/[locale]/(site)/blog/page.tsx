import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { PostList, TopicNav } from "@/components/editorial/PostList";
import { Breadcrumbs } from "@/components/marketplace/Breadcrumbs";
import styles from "@/components/editorial/editorial.module.css";
import { Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { BLOG_URL, listIndexable, postUrl } from "@/lib/content/blog";
import { collectionJsonLd, jsonLdScript } from "@/lib/marketplace/listing";
import { absoluteUrl, pageMetadata } from "@/lib/seo/metadata";
import { blogPosts } from "@/server/content/posts";

type Props = { params: Promise<{ locale: Locale }> };

// Static, refreshed when content is published, or every ten minutes (PERF-010).
export const revalidate = 600;

const TITLE = "Nilecruz blog";
const DESCRIPTION = "News, season updates and stories from the Nile, newest first.";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/** Indexed once it holds enough real posts (ADR-105); until then it stays out of search and the sitemap. */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const posts = await blogPosts(locale);
  return pageMetadata({ locale, path: BLOG_URL, title: TITLE, description: DESCRIPTION, noindex: !listIndexable(posts) });
}

/** ADR-105: the blog index. Dated posts, newest first; evergreen advice lives in the guide. */
export default async function BlogIndex({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const posts = await blogPosts(locale);
  return (
    <article className={styles.page}>
      <Breadcrumbs
        locale={locale}
        trail={[
          { name: "Home", path: "/" },
          { name: "Blog", path: BLOG_URL },
        ]}
      />
      <header className={styles.head}>
        <h1 className={styles.title}>{TITLE}</h1>
        <p className={styles.lead}>
          News, season updates and stories from the river. For planning advice that holds from year to year, read the{" "}
          <Link href="/nile-cruise-guide/">Nile cruise guide</Link>.
        </p>
      </header>
      <TopicNav posts={posts} />
      <PostList posts={posts} title="Earlier posts" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(
            collectionJsonLd(
              { name: TITLE, description: DESCRIPTION, url: absoluteUrl(locale, BLOG_URL) },
              posts.map((p) => ({ name: p.title, url: absoluteUrl(locale, postUrl(p.slug)) })),
            ),
          ),
        }}
      />
    </article>
  );
}

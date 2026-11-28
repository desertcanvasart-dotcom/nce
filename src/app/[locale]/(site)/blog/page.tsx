import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
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

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/** Indexed once it holds enough real posts (ADR-105); until then it stays out of search and the sitemap. */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const posts = await blogPosts(locale);
  const t = await getTranslations({ locale, namespace: "blog" });
  return pageMetadata({
    locale,
    path: BLOG_URL,
    title: t("title"),
    description: t("description"),
    noindex: !listIndexable(posts),
  });
}

/** ADR-105: the blog index. Dated posts, newest first; evergreen advice lives in the guide. */
export default async function BlogIndex({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const posts = await blogPosts(locale);
  const t = await getTranslations({ locale, namespace: "blog" });
  const common = await getTranslations({ locale, namespace: "common" });
  return (
    <article className={styles.page}>
      <Breadcrumbs
        locale={locale}
        trail={[
          { name: common("home"), path: "/" },
          { name: t("crumb"), path: BLOG_URL },
        ]}
      />
      <header className={styles.head}>
        <h1 className={styles.title}>{t("title")}</h1>
        <p className={styles.lead}>{t.rich("lead", { link: (c) => <Link href="/nile-cruise-guide/">{c}</Link> })}</p>
      </header>
      <TopicNav posts={posts} />
      <PostList posts={posts} title={t("earlier")} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(
            collectionJsonLd(
              { name: t("title"), description: t("description"), url: absoluteUrl(locale, BLOG_URL) },
              posts.map((p) => ({ name: p.title, url: absoluteUrl(locale, postUrl(p.slug)) })),
            ),
          ),
        }}
      />
    </article>
  );
}

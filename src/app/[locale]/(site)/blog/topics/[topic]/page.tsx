import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { PostList, TopicNav } from "@/components/editorial/PostList";
import { Breadcrumbs } from "@/components/marketplace/Breadcrumbs";
import styles from "@/components/editorial/editorial.module.css";
import { routing, type Locale } from "@/i18n/routing";
import { BLOG_TOPICS, BLOG_URL, isBlogTopic, listIndexable, postUrl, topicUrl, type BlogTopic } from "@/lib/content/blog";
import { collectionJsonLd, jsonLdScript } from "@/lib/marketplace/listing";
import { absoluteUrl, pageMetadata } from "@/lib/seo/metadata";
import { blogPosts } from "@/server/content/posts";

type Props = { params: Promise<{ locale: Locale; topic: string }> };

export const revalidate = 600;
export const dynamicParams = false;

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => Object.keys(BLOG_TOPICS).map((topic) => ({ locale, topic })));
}

const description = (topic: BlogTopic) => `${BLOG_TOPICS[topic].label} from the Nilecruz blog, newest first.`;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, topic } = await params;
  if (!isBlogTopic(topic)) return {};
  const posts = (await blogPosts(locale)).filter((p) => p.topic === topic);
  return pageMetadata({
    locale,
    path: topicUrl(topic),
    title: `${BLOG_TOPICS[topic].label} | Blog`,
    description: description(topic),
    noindex: !listIndexable(posts),
  });
}

/** ADR-105: one topic's posts. Indexed once it holds enough real posts. */
export default async function BlogTopicPage({ params }: Props) {
  const { locale, topic } = await params;
  if (!isBlogTopic(topic)) notFound();
  setRequestLocale(locale);
  const all = await blogPosts(locale);
  const posts = all.filter((p) => p.topic === topic);
  const { label } = BLOG_TOPICS[topic];
  return (
    <article className={styles.page}>
      <Breadcrumbs
        locale={locale}
        trail={[
          { name: "Home", path: "/" },
          { name: "Blog", path: BLOG_URL },
          { name: label, path: topicUrl(topic) },
        ]}
      />
      <header className={styles.head}>
        <h1 className={styles.title}>{label}</h1>
        <p className={styles.lead}>{description(topic)}</p>
      </header>
      <TopicNav posts={all} current={topic} />
      <PostList posts={posts} title={`More ${label.toLowerCase()}`} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(
            collectionJsonLd(
              { name: label, description: description(topic), url: absoluteUrl(locale, topicUrl(topic)) },
              posts.map((p) => ({ name: p.title, url: absoluteUrl(locale, postUrl(p.slug)) })),
            ),
          ),
        }}
      />
    </article>
  );
}

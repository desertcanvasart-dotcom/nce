import { Scene } from "@/components/ds/Scene/Scene";
import { Link } from "@/i18n/navigation";
import { BLOG_TOPICS, postDate, postDay, postUrl, topicUrl, type BlogPost, type BlogTopic } from "@/lib/content/blog";
import styles from "./blog.module.css";

/** A post's topic and date, as on the cards and above a post's title. */
export function PostMeta({ post, linkTopic }: { post: BlogPost; linkTopic?: boolean }) {
  const topic = BLOG_TOPICS[post.topic].label;
  return (
    <p className={styles.meta}>
      {linkTopic ? <Link href={topicUrl(post.topic)}>{topic}</Link> : <span>{topic}</span>}
      <time dateTime={postDay(post.publishedAt)}>{postDate(post.publishedAt)}</time>
      {post.sample ? <span className={styles.flag}>Sample data</span> : null}
    </p>
  );
}

/** The illustration for a post until photos arrive (ADR-096): the topic's light, the post's vessel type. */
export function PostScene({ post }: { post: BlogPost }) {
  return (
    <div className={styles.scene}>
      <Scene time={BLOG_TOPICS[post.topic].time} vessel={post.vesselTypes[0] ?? "sail"} temple={post.topic !== "vessels"} />
    </div>
  );
}

function Card({ post, heading = "h3" }: { post: BlogPost; heading?: "h2" | "h3" }) {
  const H = heading;
  return (
    <li className={styles.card}>
      <PostMeta post={post} />
      <H className={styles.cardTitle}>
        <Link href={postUrl(post.slug)}>{post.title}</Link>
      </H>
      <p className={styles.standfirst}>{post.standfirst}</p>
    </li>
  );
}

/** The index and topic pages: the newest post large with its scene, then the rest as cards. */
export function PostList({ posts, title }: { posts: BlogPost[]; title: string }) {
  const [first, ...rest] = posts;
  if (!first) return <p className={styles.empty}>The first posts are on their way.</p>;
  return (
    <>
      <article className={styles.featured} aria-labelledby="latest-post">
        <PostScene post={first} />
        <div className={styles.featuredText}>
          <PostMeta post={first} />
          <h2 id="latest-post" className={styles.featuredTitle}>
            <Link href={postUrl(first.slug)}>{first.title}</Link>
          </h2>
          <p className={styles.standfirst}>{first.standfirst}</p>
        </div>
      </article>
      {rest.length ? (
        <section aria-labelledby="more-posts">
          <h2 id="more-posts" className="visually-hidden">
            {title}
          </h2>
          <ul className={styles.grid}>
            {rest.map((p) => (
              <Card key={p.slug} post={p} />
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}

/** "More from the blog" under a post. */
export function MorePosts({ posts }: { posts: BlogPost[] }) {
  if (!posts.length) return null;
  return (
    <section aria-labelledby="more-from-the-blog">
      <h2 id="more-from-the-blog" className={styles.sectionTitle}>
        More from the blog
      </h2>
      <ul className={styles.grid}>
        {posts.map((p) => (
          <Card key={p.slug} post={p} />
        ))}
      </ul>
    </section>
  );
}

/** Topic links above the list; only topics that have posts. */
export function TopicNav({ posts, current }: { posts: BlogPost[]; current?: BlogTopic }) {
  const topics = (Object.keys(BLOG_TOPICS) as BlogTopic[]).filter((t) => posts.some((p) => p.topic === t));
  if (topics.length < 2) return null;
  return (
    <nav aria-label="Blog topics" className={styles.topics}>
      <ul>
        {topics.map((t) => (
          <li key={t}>
            <Link href={topicUrl(t)} aria-current={t === current ? "page" : undefined}>
              {BLOG_TOPICS[t].label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

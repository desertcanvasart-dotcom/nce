import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { findEntry } from "@/components/ds/registry";
import { SampleFlag } from "@/components/ds/SampleFlag/SampleFlag";
import { requireDevRoutes } from "../gate";
import styles from "../gallery.module.css";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ component: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const entry = findEntry((await params).component);
  return { title: entry ? `${entry.name} · Component gallery` : "Component gallery", robots: { index: false, follow: false } };
}

/** One component, every state (ENG-007). Each story has a stable test id for the e2e and parity suites. */
export default async function ComponentPage({ params }: Props) {
  requireDevRoutes();
  const entry = findEntry((await params).component);
  if (!entry) notFound();
  return (
    <div className={styles.page}>
      <Link href="/dev/components" className={styles.back}>
        All components
      </Link>
      <h1 className={styles.title}>{entry.name}</h1>
      {entry.stories.map((story, i) => (
        <section key={story.name} className={styles.story} aria-labelledby={`story-${i}`}>
          <div className={styles.storyHead}>
            <h2 id={`story-${i}`}>{story.name}</h2>
            {story.sample ? <SampleFlag /> : null}
          </div>
          <div
            className={story.onMedia ? styles.media : styles.canvas}
            data-testid={`story-${i}`}
            data-parity={story.parity ? "true" : undefined}
          >
            {story.render()}
          </div>
        </section>
      ))}
    </div>
  );
}

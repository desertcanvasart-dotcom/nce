import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { registry, slug } from "@/components/ds/registry";
import { requireDevRoutes } from "./gate";
import styles from "./gallery.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Component gallery", robots: { index: false, follow: false } };

/** Private gallery of every component (ENG-007). */
export default function GalleryIndex() {
  requireDevRoutes();
  const groups = [...new Set(registry.map((e) => e.group))];
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Component gallery</h1>
      <p className={styles.lead}>
        Every design-system component in every state. Switch Day and Night in the header. Stories marked Sample data use
        illustrative figures that never appear on public pages.
      </p>
      {groups.map((g) => (
        <section key={g} aria-labelledby={`g-${g}`}>
          <h2 className={styles.group} id={`g-${g}`}>
            {g}
          </h2>
          <ul className={styles.list}>
            {registry
              .filter((e) => e.group === g)
              .map((e) => (
                <li key={e.name}>
                  <Link href={`/dev/components/${slug(e.name)}`}>
                    <b>{e.name}</b>
                    <small>{e.stories.length === 1 ? "1 state" : `${e.stories.length} states`}</small>
                  </Link>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

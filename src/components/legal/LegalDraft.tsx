import type { ReactNode } from "react";
import styles from "./LegalDraft.module.css";

/** Wrapper for draft legal pages (ENG-019, ADR-031): visible draft banner, English only. */
export function LegalDraft({
  title,
  updated,
  banner,
  children,
}: {
  title: string;
  updated: string;
  banner: string;
  children: ReactNode;
}) {
  return (
    <article className={styles.article}>
      <p className={styles.banner} role="note">
        {banner}
      </p>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.updated}>Draft prepared {updated}</p>
      {children}
    </article>
  );
}

/** A fact Faris must supply. Rendered visibly so a draft can never pass as final (CLAUDE.md §6). */
export function Placeholder({ children }: { children: ReactNode }) {
  return <mark className={styles.placeholder}>[To be supplied: {children}]</mark>;
}

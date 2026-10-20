import { Link } from "@/i18n/navigation";
import { LINK_MAP, type Link as SiloLink } from "@/lib/seo/links";
import styles from "./editorial.module.css";

/** SEO-009, 010: a hub's children, or "Keep reading" siblings, as cards whose link text is the target's keyword. */
export function LinkCards({ title, links, id }: { title: string; links: SiloLink[]; id: string }) {
  if (!links.length) return null;
  return (
    <section className={styles.cards} aria-labelledby={id}>
      <h2 id={id}>{title}</h2>
      <ul>
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href}>{l.anchor}</Link>
            <span>{LINK_MAP[l.href]?.h1}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

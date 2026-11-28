import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { h1Of, LINK_MAP, type Link as SiloLink } from "@/lib/seo/links";
import styles from "./editorial.module.css";

/** SEO-009, 010: a hub's children, or "Keep reading" siblings, as cards whose link text is the target's keyword. */
export function LinkCards({ title, links, id }: { title: string; links: SiloLink[]; id: string }) {
  const locale = useLocale() as Locale;
  if (!links.length) return null;
  return (
    <section className={styles.cards} aria-labelledby={id}>
      <h2 id={id}>{title}</h2>
      <ul>
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href}>{l.anchor}</Link>
            <span>{LINK_MAP[l.href] ? h1Of(l.href, locale) : null}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

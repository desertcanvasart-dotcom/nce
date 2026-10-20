import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { breadcrumbJsonLd, jsonLdScript } from "@/lib/marketplace/listing";
import { absoluteUrl } from "@/lib/seo/metadata";
import styles from "./marketplace.module.css";

export type Trail = { name: string; path: string }[];

/** SEO-004: a visible breadcrumb and its BreadcrumbList. The last item is the current page. */
export function Breadcrumbs({ locale, trail }: { locale: Locale; trail: Trail }) {
  const json = breadcrumbJsonLd(trail.map((c) => ({ name: c.name, url: absoluteUrl(locale, c.path) })));
  return (
    <>
      <nav aria-label="Breadcrumb" className={styles.crumbs}>
        <ol>
          {trail.map((c, i) =>
            i === trail.length - 1 ? (
              <li key={c.path} aria-current="page">
                {c.name}
              </li>
            ) : (
              <li key={c.path}>
                <Link href={c.path}>{c.name}</Link>
              </li>
            ),
          )}
        </ol>
      </nav>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(json) }} />
    </>
  );
}

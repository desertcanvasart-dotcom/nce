import { getLocale, getTranslations } from "next-intl/server";
import { SiteFrame } from "@/components/shell/SiteFrame";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { blogHasPosts } from "@/server/content/posts";
import styles from "./status.module.css";

/** Localised 404 in the brand voice (ENG-017). */
export default async function NotFound() {
  const t = await getTranslations("notFound");
  const locale = await getLocale();
  // Rendered above the (site) group, so it brings the public frame itself.
  return (
    <SiteFrame locale={locale} blog={await blogHasPosts(locale as Locale)}>
      <section className={styles.status}>
        <title>{t("metaTitle")}</title>
        <meta name="robots" content="noindex" />
        <p className={styles.code}>404</p>
        <h1 className={styles.title}>{t("title")}</h1>
        <p className={styles.body}>{t("body")}</p>
        <p className={styles.actions}>
          <Link href="/">{t("home")}</Link>
          <Link href="/cruises">{t("cruises")}</Link>
        </p>
      </section>
    </SiteFrame>
  );
}

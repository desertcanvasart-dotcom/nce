import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import styles from "./status.module.css";

/** Localised 404 in the brand voice (ENG-017). */
export default async function NotFound() {
  const t = await getTranslations("notFound");
  return (
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
  );
}

"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import styles from "./status.module.css";

/** Localised 500 in the brand voice (ENG-017). */
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("error");
  return (
    <section className={styles.status}>
      <p className={styles.code}>500</p>
      <h1 className={styles.title}>{t("title")}</h1>
      <p className={styles.body}>{t("body")}</p>
      <p className={styles.actions}>
        <button type="button" onClick={reset} className={styles.button}>
          {t("retry")}
        </button>
        <Link href="/">{t("home")}</Link>
      </p>
    </section>
  );
}

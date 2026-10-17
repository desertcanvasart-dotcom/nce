import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { pageMetadata } from "@/lib/seo/metadata";
import styles from "./page.module.css";

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    ...pageMetadata({ locale, path: "/", title: t("homeTitle"), description: t("homeDescription") }),
    title: { absolute: `${t("homeTitle")} | ${t("siteName")}` },
  };
}

/** Batch 1 placeholder. The real homepage (PAGE-001) is built in Batch 6. H1 is the silo's P001 H1. */
export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");
  return (
    <section className={styles.hero}>
      <p className={styles.eyebrow}>{t("eyebrow")}</p>
      <h1 className={styles.title}>{t("title")}</h1>
      <p className={styles.lead}>{t("lead")}</p>
    </section>
  );
}

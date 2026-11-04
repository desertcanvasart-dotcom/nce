import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { fontVariables } from "@/app/fonts";
import { siteUrl } from "@/lib/env";
import { THEME_BOOTSTRAP } from "@/components/shell/theme-bootstrap";
import { ThemeSync } from "@/components/shell/ThemeSync";
import shell from "@/components/shell/Container.module.css";
import "@/styles/global.css";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    metadataBase: new URL(siteUrl),
    title: { default: t("homeTitle"), template: `%s | ${t("siteName")}` },
  };
}

const PAGE_ONLY = new Set(["vesselPage", "guideHub"]);

export default async function LocaleLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "shell" });
  // Every page's client components get the site's words, except the vessel page's (two fifths of them) and the guide
  // hub's: only the pages that use them pass those on (VesselMessages, GuideHub), so no other page downloads them.
  const messages = Object.fromEntries(Object.entries(await getMessages()).filter(([ns]) => !PAGE_ONLY.has(ns)));

  return (
    // data-theme is owned by the bootstrap script, never by React: if React rendered it, a client re-mount
    // (e.g. after an error) would reset a saved Night theme to Day. Day is the CSS default on :root.
    <html lang={locale} className={fontVariables(locale)} suppressHydrationWarning>
      <head>
        {/* Applies the saved theme before first paint, so there is no flash of the wrong theme (TOK-THEMES). */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
        {/* Without JavaScript, hide controls that need it (the theme switch); the page stays in Day. */}
        <noscript>
          <style>{".js-only{display:none!important}"}</style>
        </noscript>
      </head>
      <body>
        <NextIntlClientProvider messages={messages}>
          <ThemeSync />
          <a href="#main" className={shell.skip}>
            {t("skipToContent")}
          </a>
          {/* The public site frame lives in (site)/layout.tsx; dashboards have their own (dashboard/layout.tsx). */}
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

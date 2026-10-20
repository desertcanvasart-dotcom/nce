"use client";

import NextLink from "next/link";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import styles from "./HeaderAccount.module.css";

// The header renders this twice (menu and bar); both share one request.
let pending: Promise<boolean> | null = null;
function fetchSignedIn(): Promise<boolean> {
  pending ??= fetch("/api/session/", { cache: "no-store", credentials: "same-origin" })
    .then((r) => (r.ok ? r.json() : null))
    .then((body: { signedIn?: unknown } | null) => body?.signedIn === true)
    .catch(() => false)
    .finally(() => {
      pending = null;
    });
  return pending;
}

/**
 * The header's account links. Public pages are static (PERF-010), so the server always renders "Sign in"
 * (also the no-JavaScript fallback); after load this asks /api/session/ and, for a signed-in visitor,
 * shows "Account" (their dashboard) and "Sign out" instead.
 */
export function HeaderAccount({ className }: { className?: string }) {
  const t = useTranslations("shell");
  const locale = useLocale();
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let live = true;
    void fetchSignedIn().then((v) => {
      if (live) setSignedIn(v);
    });
    return () => {
      live = false;
    };
  }, []);

  if (!signedIn) {
    return (
      <Link href="/account/sign-in/" className={className}>
        {t("signIn")}
      </Link>
    );
  }
  const prefix = locale === routing.defaultLocale ? "" : `/${locale}`;
  return (
    <>
      {/* Dashboards are English only (DASH-BND-006), so no language prefix. */}
      <NextLink href="/dashboard/" prefetch={false} className={className}>
        {t("account")}
      </NextLink>
      <form method="post" action={`${prefix}/account/sign-out/`} className={styles.form}>
        <button type="submit" className={`${className ?? ""} ${styles.button}`}>
          {t("signOut")}
        </button>
      </form>
    </>
  );
}

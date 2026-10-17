import type { ReactNode } from "react";
import shell from "./Container.module.css";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

/** The public site frame: header, main content and footer (ENG-018). Dashboards use their own frame. */
export function SiteFrame({ locale, children }: { locale: string; children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main id="main" tabIndex={-1} className={shell.main}>
        {children}
      </main>
      <SiteFooter locale={locale} />
    </>
  );
}

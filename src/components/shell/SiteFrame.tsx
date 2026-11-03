import type { ReactNode } from "react";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";
import { SiteMain } from "./SiteMain";

/** The public site frame: header, main content and footer (ENG-018). Dashboards use their own frame. */
export function SiteFrame({ locale, blog, children }: { locale: string; blog?: boolean; children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <SiteMain>{children}</SiteMain>
      <SiteFooter locale={locale} blog={blog} />
    </>
  );
}

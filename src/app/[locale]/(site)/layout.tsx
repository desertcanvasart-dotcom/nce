import type { ReactNode } from "react";
import { SiteFrame } from "@/components/shell/SiteFrame";
import type { Locale } from "@/i18n/routing";
import { blogHasPosts } from "@/server/content/posts";

export default async function SiteLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <SiteFrame locale={locale} blog={await blogHasPosts(locale as Locale)}>
      {children}
    </SiteFrame>
  );
}

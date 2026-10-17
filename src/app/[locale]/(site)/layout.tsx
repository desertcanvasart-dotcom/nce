import type { ReactNode } from "react";
import { SiteFrame } from "@/components/shell/SiteFrame";

export default async function SiteLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  return <SiteFrame locale={(await params).locale}>{children}</SiteFrame>;
}

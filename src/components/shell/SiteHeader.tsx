import { useTranslations } from "next-intl";
import { NavBar } from "@/components/ds/NavBar/NavBar";
import { mainNav } from "./nav-items";

/** The site header: the design-system NavBar with the silo navigation (SEO-015, Q8). */
export function SiteHeader() {
  const t = useTranslations("nav");
  return (
    <NavBar
      links={mainNav.map((item) => ({ label: t(item.key), href: item.href }))}
      cta={{ label: t("cta"), href: "/plan-my-cruise" }}
    />
  );
}

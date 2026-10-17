import { useTranslations } from "next-intl";
import { NavBar } from "@/components/ds/NavBar/NavBar";
import { mainNav } from "./nav-items";

/** The site header: the design-system NavBar with the silo navigation (SEO-015, Q8). */
export function SiteHeader() {
  const t = useTranslations("nav");
  const shell = useTranslations("shell");
  return (
    <NavBar
      links={mainNav.map((item) => ({ label: t(item.key), href: item.href }))}
      cta={{ label: t("cta"), href: "/plan-my-cruise" }}
      // Static, so public pages stay cacheable; signed-in visitors are sent on to their dashboard.
      account={{ label: shell("signIn"), href: "/account/sign-in" }}
    />
  );
}

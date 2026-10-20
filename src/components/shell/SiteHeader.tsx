import { useTranslations } from "next-intl";
import { NavBar } from "@/components/ds/NavBar/NavBar";
import { HeaderAccount } from "./HeaderAccount";
import { mainNav } from "./nav-items";

/** The site header: the design-system NavBar with the silo navigation (SEO-015, Q8). */
export function SiteHeader() {
  const t = useTranslations("nav");
  return (
    <NavBar
      links={mainNav.map((item) => ({ label: t(item.key), href: item.href }))}
      cta={{ label: t("cta"), href: "/plan-my-cruise" }}
      // A client island, so public pages stay static: "Sign in" until the session check says otherwise.
      account={(className) => <HeaderAccount className={className} />}
    />
  );
}

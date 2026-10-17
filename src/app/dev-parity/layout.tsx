import type { ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import { fontVariables } from "@/app/fonts";
import en from "../../../messages/en.json";
import "@/styles/global.css";

export const metadata = { robots: { index: false, follow: false } };

/**
 * Bare frame for visual parity (ENG-009): no site header or footer, 32px padding, like the design system's
 * preview.html pages. The theme comes from ?theme=dark, as in the previews. Dev-only (ENABLE_DEV_ROUTES).
 */
export default function ParityLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={fontVariables("en")} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `document.documentElement.setAttribute("data-theme",new URLSearchParams(location.search).get("theme")==="dark"?"dark":"light")`,
          }}
        />
      </head>
      <body>
        <NextIntlClientProvider locale="en" messages={en} timeZone="UTC">
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

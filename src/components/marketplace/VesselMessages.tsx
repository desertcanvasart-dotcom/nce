import type { ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";

/**
 * The vessel page's words for its client components (photos, cabin cards, the deck plan). The root layout leaves them
 * out so other pages don't download them; a provider rendered on the server without `messages` passes them all.
 */
export function VesselMessages({ children }: { children: ReactNode }) {
  return <NextIntlClientProvider>{children}</NextIntlClientProvider>;
}

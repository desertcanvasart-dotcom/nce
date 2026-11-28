import type { ReactNode } from "react";
import { NextIntlClientProvider, useMessages } from "next-intl";
import { clientMessages } from "@/i18n/client-messages";

/**
 * The vessel page's words for its client components (photos, cabin cards, the deck plan). The root layout leaves them
 * out so other pages don't download them; this adds them back.
 */
export function VesselMessages({ children }: { children: ReactNode }) {
  const messages = clientMessages(useMessages(), "vesselPage");
  return <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>;
}

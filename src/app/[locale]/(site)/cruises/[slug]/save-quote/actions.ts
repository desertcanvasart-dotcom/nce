"use server";

import { getTranslations } from "next-intl/server";
import { z } from "zod";
import type { ActionState } from "@/components/dashboard/ActionForm";
import { routing, type Locale } from "@/i18n/routing";
import { hasFigure } from "@/lib/marketplace/public-price";
import { requireUser } from "@/server/auth";
import { failed, formObject, saved } from "@/server/catalogue/form";
import { getDb } from "@/server/db";
import { publicVessel } from "@/server/marketplace/queries";

const input = z.object({
  itinerary: z.string().max(40).optional(),
  date: z.union([z.literal(""), z.iso.date()]).optional(),
  guests: z.union([z.literal(""), z.coerce.number().int().min(1).max(30)]).optional(),
  cabin: z.string().max(80).optional(),
  alert: z.literal("on").optional(),
});

/**
 * ADR-109, Level 3: keep a quote in the traveller's account, with an alert when the vessel's public price changes.
 * Offered only after a rate was shown or an enquiry sent. The alert is kept only when the vessel has a public figure
 * that can change; reading prices and asking for an offer never need an account.
 */
export async function saveQuote(slug: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const asked = String(fd.get("locale") ?? "en");
  const locale: Locale = (routing.locales as readonly string[]).includes(asked) ? (asked as Locale) : "en";
  await requireUser(`/cruises/${slug}/save-quote/`);
  const t = await getTranslations({ locale, namespace: "pricing.save" });
  const r = input.safeParse(formObject(fd));
  if (!r.success) return failed(t("failed"));
  const v = await publicVessel(slug, locale);
  if (!v) return failed(t("failed"));
  const it = v.itineraries.find((i) => i.code === r.data.itinerary);
  const cabin = v.cabins.find((c) => c.id === r.data.cabin);
  const db = await getDb();
  const { error } = await db.from("saved_quotes").insert({
    vessel_id: v.id,
    schedule_code: it?.code ?? null,
    route: it ? `${it.origin}→${it.destination}` : null,
    nights: it?.nights ?? null,
    departs_on: r.data.date || null,
    guests: r.data.guests === "" || r.data.guests === undefined ? null : r.data.guests,
    cabin_preference: cabin?.name ?? null,
    price_alert: r.data.alert === "on" && hasFigure(v.price),
  });
  if (error) return failed(t("failed"));
  return saved(t("saved"));
}

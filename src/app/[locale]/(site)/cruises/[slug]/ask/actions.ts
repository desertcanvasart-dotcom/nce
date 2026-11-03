"use server";

import { getTranslations } from "next-intl/server";
import { z } from "zod";
import type { ActionState } from "@/components/dashboard/ActionForm";
import { routing, type Locale } from "@/i18n/routing";
import { allowAnonymous } from "@/server/auth";
import { failed, formObject, saved } from "@/server/catalogue/form";
import { getDb } from "@/server/db";
import { publicVessel } from "@/server/marketplace/queries";
import { rateLimit, trapFilled } from "@/server/security/rate-limit";

const input = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.email().max(254),
  itinerary: z.string().max(40).optional(),
  date: z.union([z.literal(""), z.iso.date()]).optional(),
  guests: z.union([z.literal(""), z.coerce.number().int().min(1).max(30)]).optional(),
  message: z.string().trim().max(4000).optional(),
});

/**
 * "Ask for an offer" on a vessel page, without an account: a contact message for admins (ADR-097) that keeps the boat,
 * the itinerary's route and nights, the date and the party it was asked for. Limited like the Contact form.
 */
export async function askForOffer(slug: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  allowAnonymous();
  const asked = String(fd.get("locale") ?? "en");
  const locale: Locale = (routing.locales as readonly string[]).includes(asked) ? (asked as Locale) : "en";
  const t = await getTranslations({ locale, namespace: "vesselPage.ask" });
  // A field people never see: bots fill it in. Answer as if it worked, and keep nothing.
  if (trapFilled(fd)) return saved(t("sent"));
  const limit = await rateLimit("contact");
  if (!limit.ok) return failed(t("tooMany"));
  const r = input.safeParse(formObject(fd));
  if (!r.success) {
    const labels: Record<string, string> = { name: t("name"), email: t("email"), date: t("date"), guests: t("guests") };
    const fields = [...new Set(r.error.issues.map((i) => labels[String(i.path[0])] ?? t("message")))];
    return failed(t("invalid", { fields: fields.join(", ") }));
  }
  const v = await publicVessel(slug);
  if (!v) return failed(t("failed"));
  const it = v.itineraries.find((i) => i.code === r.data.itinerary);
  const guests = r.data.guests === "" || r.data.guests === undefined ? null : r.data.guests;
  const date = r.data.date || null;
  // The table keeps a message of at least a sentence; an empty note becomes a plain one for the admins.
  const message =
    r.data.message && r.data.message.length >= 10 ? r.data.message : `${r.data.message ?? ""} Offer request for ${v.name}.`.trim();
  const db = await getDb();
  const { error } = await db.from("contact_messages").insert({
    name: r.data.name,
    email: r.data.email,
    topic: "offer",
    message,
    vessel_id: v.id,
    route: it ? `${it.origin}→${it.destination}` : null,
    nights: it?.nights ?? null,
    departs_on: date,
    guests,
  });
  if (error) return failed(t("failed"));
  return saved(t("sent"));
}

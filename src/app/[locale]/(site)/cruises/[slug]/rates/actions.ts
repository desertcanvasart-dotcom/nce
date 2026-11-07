"use server";

import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { formatDate, formatMoney } from "@/components/ds/lib/format";
import { routing, type Locale } from "@/i18n/routing";
import { showsSignedInPrice } from "@/lib/marketplace/public-price";
import { allowAnonymous, getSession } from "@/server/auth";
import { formObject } from "@/server/catalogue/form";
import { getDb } from "@/server/db";
import { publicVessel } from "@/server/marketplace/queries";
import { rateLimit, trapFilled } from "@/server/security/rate-limit";
import type { RatesState } from "@/components/marketplace/RatesForm";

const input = z.object({
  email: z.union([z.literal(""), z.email().max(254)]).optional(),
  itinerary: z.string().max(40).optional(),
  date: z.union([z.literal(""), z.iso.date()]).optional(),
  guests: z.union([z.literal(""), z.coerce.number().int().min(1).max(30)]).optional(),
  cabin: z.string().max(80).optional(),
});

/**
 * ADR-109, Level 2: "Check rates for your dates". By default an adviser checks availability and sends the offer by
 * email: a contact message that keeps the vessel, the route, the nights, the date, the party and the cabin wanted.
 * Only the email address is asked for, and no account is needed. Where the vessel shows a signed-in price and the
 * traveller is signed in, the rate for that one date is shown instead (rate-limited per account; never a list of
 * dates and prices). No public page ever shows a price for given dates.
 */
export async function checkRates(slug: string, _prev: RatesState, fd: FormData): Promise<RatesState> {
  allowAnonymous();
  const asked = String(fd.get("locale") ?? "en");
  const locale: Locale = (routing.locales as readonly string[]).includes(asked) ? (asked as Locale) : "en";
  const t = await getTranslations({ locale, namespace: "pricing.rates" });
  if (trapFilled(fd)) return { ok: true, message: t("sent") };
  const r = input.safeParse(formObject(fd));
  if (!r.success) {
    const labels: Record<string, string> = { email: t("email"), date: t("date"), guests: t("guests") };
    const fields = [...new Set(r.error.issues.map((i) => labels[String(i.path[0])] ?? t("cabin")))];
    return { ok: false, message: t("invalid", { fields: fields.join(", ") }) };
  }
  const v = await publicVessel(slug, locale);
  if (!v) return { ok: false, message: t("failed") };
  const it = v.itineraries.find((i) => i.code === r.data.itinerary);
  const guests = r.data.guests === "" || r.data.guests === undefined ? null : r.data.guests;
  const date = r.data.date || null;
  const cabin = v.cabins.find((c) => c.id === r.data.cabin);
  const quote = new URLSearchParams({
    ...(it ? { itinerary: it.code } : {}),
    ...(date ? { date } : {}),
    ...(guests ? { guests: String(guests) } : {}),
    ...(cabin ? { cabin: cabin.id } : {}),
  }).toString();
  const session = await getSession();

  // A signed-in price, only where the vessel has it set, for one date, cabin and party.
  if (session && showsSignedInPrice(v.rateDisplay, v.bookable) && it && date && guests && guests <= 3) {
    const limit = await rateLimit("rate-check", session.userId);
    if (!limit.ok) return { ok: false, message: t("tooMany") };
    const db = await getDb();
    const { data } = await db.rpc("vessel_departure_prices", { target: v.id, pkg: "cruise" });
    const per = (row: { single_minor: number | null; double_minor: number | null; triple_minor: number | null }) =>
      guests === 1 ? row.single_minor : guests === 2 ? row.double_minor : row.triple_minor;
    // Euros only: a rate in any other currency is never converted, so it is not shown.
    const fits = (data ?? []).filter(
      (row) =>
        row.schedule_id === it.id &&
        row.departs_on === date &&
        row.currency === "EUR" &&
        row.bookable &&
        (!cabin || row.cabin_type_id === cabin.id) &&
        per(row) !== null,
    );
    const best = fits.sort((a, b) => Number(per(a)) - Number(per(b)))[0];
    if (best) {
      const name = v.cabins.find((c) => c.id === best.cabin_type_id)?.name ?? "";
      return {
        ok: true,
        message: t("signedInResult", {
          price: formatMoney({ amount: Number(per(best)), currency: "EUR" }, locale),
          date: formatDate(date, locale),
          cabin: name,
        }),
        quote,
      };
    }
  }

  // An adviser's offer by email: the address is the only thing asked (a signed-in traveller's own is used).
  const email = r.data.email || session?.email;
  if (!email) return { ok: false, message: t("invalid", { fields: t("email") }) };
  const limit = await rateLimit("contact");
  if (!limit.ok) return { ok: false, message: t("tooMany") };
  const db = await getDb();
  const { error } = await db.from("contact_messages").insert({
    name: session?.fullName ?? null,
    email,
    topic: "offer",
    message: `Check rates for ${v.name}${it ? `, ${it.nights} nights ${it.origin}→${it.destination}` : ""}${date ? `, departing ${date}` : ""}${guests ? `, ${guests} guests` : ""}${cabin ? `, ${cabin.name}` : ""}.`,
    vessel_id: v.id,
    route: it ? `${it.origin}→${it.destination}` : null,
    nights: it?.nights ?? null,
    departs_on: date,
    guests,
    cabin_preference: cabin?.name ?? null,
  });
  if (error) return { ok: false, message: t("failed") };
  return { ok: true, message: t("sent"), quote };
}

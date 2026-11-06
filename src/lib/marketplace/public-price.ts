/**
 * Public starting prices (ADR-109, replacing ADR-025 for starting prices), kept free of I/O so it is unit-tested.
 *
 * Level 1: everyone sees one starting price per vessel, in euros, already including Nilecruz's margin: "from" a figure,
 * a typical band, or "Price on request". A figure is shown only when the operator approved it, it is in euros, in
 * date, and its basis and the date it was last checked are known. Anything missing or expired shows no figure.
 * Never a net rate, a margin, a cabin rate list or a price for given dates.
 */
import type { Money } from "@/components/ds/lib/types";

export type PublicPriceMode = "from_price" | "price_band" | "on_request";
export type PriceBasis = "per_person_per_trip" | "per_person_per_night";
export type RateDisplay = "offer_by_adviser" | "signed_in_price";

/** The vessel's public price fields, as stored (amounts in euro cents). */
export type PublicPriceData = {
  publicPriceMode: PublicPriceMode;
  fromPriceAmount: number | null;
  priceBandMin: number | null;
  priceBandMax: number | null;
  priceCurrency: string;
  priceBasis: PriceBasis | null;
  /** A per-trip price's cruise length, once the sailing is confirmed. */
  priceTripNights: number | null;
  priceValidFrom: string | null;
  priceValidTo: string | null;
  priceLastChecked: string | null;
  operatorPriceApproved: boolean;
  rateDisplayAfterRequest: RateDisplay;
};

/** What the public may see. */
export type PublicPrice =
  | { mode: "from_price"; from: Money; basis: PriceBasis; nights: number | null; lastChecked: string }
  | { mode: "price_band"; min: Money; max: Money; basis: PriceBasis; nights: number | null; lastChecked: string }
  | { mode: "on_request" };

export const ON_REQUEST: PublicPrice = { mode: "on_request" };

/** The safe defaults: no figure, and a rate for given dates comes as an adviser's offer by email. */
export const DEFAULT_PRICE_DATA: PublicPriceData = {
  publicPriceMode: "on_request",
  fromPriceAmount: null,
  priceBandMin: null,
  priceBandMax: null,
  priceCurrency: "EUR",
  priceBasis: null,
  priceTripNights: null,
  priceValidFrom: null,
  priceValidTo: null,
  priceLastChecked: null,
  operatorPriceApproved: false,
  rateDisplayAfterRequest: "offer_by_adviser",
};

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** The price the public may see today (`today` is yyyy-mm-dd, Cairo). */
export function publicPrice(d: PublicPriceData | null | undefined, today: string): PublicPrice {
  if (!d || d.publicPriceMode === "on_request") return ON_REQUEST;
  // The euro is the only public selling currency: anything else is never converted, only withheld.
  if (!d.operatorPriceApproved || d.priceCurrency !== "EUR" || !d.priceBasis) return ON_REQUEST;
  if (!d.priceLastChecked || !ISO.test(d.priceLastChecked)) return ON_REQUEST;
  if (d.priceValidFrom && d.priceValidFrom > today) return ON_REQUEST;
  if (d.priceValidTo && d.priceValidTo < today) return ON_REQUEST;
  const eur = (amount: number): Money => ({ amount, currency: "EUR" });
  const nights = d.priceBasis === "per_person_per_trip" ? d.priceTripNights : null;
  const common = { basis: d.priceBasis, nights, lastChecked: d.priceLastChecked };
  if (d.publicPriceMode === "from_price") {
    if (!d.fromPriceAmount || d.fromPriceAmount <= 0) return ON_REQUEST;
    return { mode: "from_price", from: eur(d.fromPriceAmount), ...common };
  }
  if (!d.priceBandMin || !d.priceBandMax || d.priceBandMin <= 0 || d.priceBandMin > d.priceBandMax) return ON_REQUEST;
  return { mode: "price_band", min: eur(d.priceBandMin), max: eur(d.priceBandMax), ...common };
}

export const hasFigure = (p: PublicPrice | undefined): p is Exclude<PublicPrice, { mode: "on_request" }> =>
  !!p && p.mode !== "on_request";

/** The lowest figure, for sorting by starting price; none for "Price on request". */
export const sortAmount = (p: PublicPrice | undefined): number | null =>
  !p || p.mode === "on_request" ? null : p.mode === "from_price" ? p.from.amount : p.min.amount;

/** The keys of the Level 1 sentence in the `price` messages, and their values (formatted by the caller). */
export function priceMessage(
  p: PublicPrice,
  money: (m: Money) => string,
): { key: "level1.from" | "level1.band" | "level1.onRequest"; values: Record<string, string> } {
  if (p.mode === "from_price") return { key: "level1.from", values: { price: money(p.from) } };
  if (p.mode === "price_band") return { key: "level1.band", values: { min: money(p.min), max: money(p.max) } };
  return { key: "level1.onRequest", values: {} };
}

/** A signed-in traveller may see a rate for chosen dates only where the vessel has that set and can be booked. */
export const showsSignedInPrice = (rateDisplay: RateDisplay | undefined, bookable: boolean) =>
  bookable && rateDisplay === "signed_in_price";
